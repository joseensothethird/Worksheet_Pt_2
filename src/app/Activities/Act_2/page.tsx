"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import activityStyles from "../../../CSS/activities.module.css";
import driveStyles from "../../../CSS/google.module.css"; // optional if you have separate styling
import { useRouter } from "next/navigation";

export default function DriveLitePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  // 🔐 Auth check — redirect if not logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // 📸 Fetch user photos
  const fetchPhotos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setPhotos(data || []);
  };

  useEffect(() => {
    if (user) fetchPhotos();
  }, [user]);

  // 📤 Handle file upload
  const handleUpload = async () => {
    if (!file || !user) {
      alert("Please select a file first!");
      return;
    }

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { data, error: uploadError } = await supabase.storage
      .from("drive-lite")
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      alert("❌ Upload failed!");
      return;
    }

    const { data: urlData, error: urlError } = supabase.storage
      .from("drive-lite")
      .getPublicUrl(fileName);

    if (urlError) {
      console.error(urlError);
      alert("❌ Could not get public URL!");
      return;
    }

    const { error: insertError } = await supabase.from("photos").insert([
      {
        name: file.name,
        url: urlData.publicUrl,
        user_id: user.id,
      },
    ]);

    if (insertError) {
      console.error(insertError);
      alert("❌ Database insert failed!");
      return;
    }

    alert("✅ File uploaded successfully!");
    setFile(null);
    fetchPhotos();
  };

  // ❌ Delete photo
  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    // Delete from storage
    const path = fileUrl.split("/drive-lite/")[1]; // extract path from URL
    await supabase.storage.from("drive-lite").remove([path]);

    // Delete from database
    await supabase.from("photos").delete().eq("id", id);

    fetchPhotos();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className={activityStyles.container}>
      <div className={activityStyles.card}>
        <h1 className={activityStyles.title}>📁 Google Drive Lite</h1>
        <p className={activityStyles.subtitle}>
          Upload, view, and manage your photos
        </p>

        {/* File Upload Section */}
        <div className={activityStyles.uploadSection}>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={handleUpload}
            className={activityStyles.btnPrimary}
          >
            Upload
          </button>
        </div>

        {/* Photos Display Section */}
        <div className={activityStyles.galleryGrid}>
          {photos.length === 0 ? (
            <p>No photos uploaded yet.</p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className={activityStyles.galleryItem}>
                <img
                  src={photo.url}
                  alt={photo.name}
                  className={activityStyles.photoThumb}
                />
                <div className={activityStyles.photoActions}>
                  <p className={activityStyles.photoName}>{photo.name}</p>
                  <button
                    onClick={() => handleDelete(photo.id, photo.url)}
                    className={activityStyles.btnDanger}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          className={activityStyles.btnSecondary}
          onClick={() => router.push("/")}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
