"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import styles from "../../../CSS/google.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface User {
  id: string;
  email: string;
}

interface Photo {
  id: string;
  name: string;
  url: string;
  user_id: string;
  size?: number;
  created_at: string;
}

export default function WorkSheetPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // 🔐 Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "unknown",
        });
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  // 📸 Fetch user photos
  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setPhotos(data || []);
  }, [user]);

  useEffect(() => {
    if (user) fetchPhotos();
  }, [user, fetchPhotos]);

  // 📤 Upload file to drive-lite/photos/{user.id}/timestamp_filename
  const handleUpload = async () => {
    if (!file || !user) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);

    // Correct path for your Supabase bucket
    const filePath = `photos/${user.id}/${Date.now()}_${file.name}`;
    console.log("Uploading to drive-lite:", filePath);

    // ✅ Upload to drive-lite bucket
    const { data, error: uploadError } = await supabase.storage
      .from("drive-lite")
      .upload(filePath, file);

    if (uploadError) {
      console.error("❌ Upload failed:", uploadError.message);
      alert("❌ Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    console.log("✅ File uploaded:", data);

    // ✅ Get public URL
    const { data: publicData } = supabase.storage
      .from("drive-lite")
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      alert("❌ Could not generate public URL!");
      setUploading(false);
      return;
    }

    // ✅ Save metadata to DB
    const { error: insertError } = await supabase.from("photos").insert([
      {
        name: file.name,
        url: publicUrl,
        user_id: user.id,
        size: Math.round(file.size / 1024),
      },
    ]);

    if (insertError) {
      console.error(insertError);
      alert("❌ Database insert failed: " + insertError.message);
      setUploading(false);
      return;
    }

    alert("✅ File uploaded successfully to drive-lite/photos/");
    setFile(null);
    setUploading(false);
    fetchPhotos();
  };

  // ❌ Delete photo
  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    // Correct remove path for drive-lite
    const path = fileUrl.split("/storage/v1/object/public/drive-lite/")[1];
    if (!path) {
      alert("❌ Invalid file path — cannot delete.");
      return;
    }

    const { error: storageError } = await supabase.storage
      .from("drive-lite")
      .remove([path]);

    if (storageError) {
      console.error(storageError);
      alert("❌ Storage delete failed: " + storageError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .eq("id", id);

    if (dbError) console.error(dbError);
    fetchPhotos();
  };

  // 🔍 Filter + Sort
  const filteredPhotos = photos
    .filter((photo) =>
      photo.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortOption === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sortOption === "az") return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <h2>Loading WorkSheet</h2>
            <p>Please wait while we load your files...</p>
          </div>
        </div>
      </div>
    );
  }

  // 🧱 UI Layout
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <svg width="32" height="32" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
                />
              </svg>
              <span className={styles.logoText}>Drive Lite</span>
            </div>
            <div className={styles.breadcrumb}>My Photos</div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className={styles.userName}>{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search photos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.toolbarActions}>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className={styles.sortSelect}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">Name A-Z</option>
              <option value="za">Name Z-A</option>
            </select>

            <div className={styles.uploadArea}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: "none" }}
                id="file-upload"
              />
              <label htmlFor="file-upload" className={styles.uploadButton}>
                Upload New
              </label>
            </div>
          </div>
        </div>

        {/* Upload Preview */}
        {file && (
          <div className={styles.uploadCard}>
            <div className={styles.uploadCardHeader}>
              <h3>Upload Photo</h3>
              <button onClick={() => setFile(null)} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.uploadCardContent}>
              <div className={styles.fileDetails}>
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>
                  {(file.size / 1024).toFixed(2)} KB
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={styles.uploadConfirmButton}
              >
                {uploading ? "Uploading..." : "Upload to Drive Lite"}
              </button>
            </div>
          </div>
        )}

        {/* Files Grid */}
        <div className={styles.filesGrid}>
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className={styles.fileCard}>
              <div className={styles.fileThumbnail}>
                <Image
                  src={photo.url}
                  alt={photo.name}
                  width={300}
                  height={200}
                  className={styles.fileImage}
                  unoptimized
                />
                <div className={styles.fileOverlay}>
                  <button
                    onClick={() => window.open(photo.url, "_blank")}
                    title="View"
                  >
                    👁
                  </button>
                  <button
                    title="Download"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = photo.url;
                      link.download = photo.name;
                      link.click();
                    }}
                  >
                    ⬇
                  </button>
                  <button
                    onClick={() => handleDelete(photo.id, photo.url)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{photo.name}</div>
                <div className={styles.fileMeta}>
                  {new Date(photo.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPhotos.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <h3>No photos yet</h3>
            <p>Upload your first photo to get started</p>
          </div>
        )}

        <div className={styles.actionButtons}>
          <button
            className={styles.backButton}
            onClick={() => window.history.back()}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
