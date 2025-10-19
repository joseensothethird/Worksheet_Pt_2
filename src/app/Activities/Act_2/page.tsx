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

export default function DriveLitePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // 🔐 Auth check — redirect if not logged in
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

  // 📤 Handle Upload
  const handleUpload = async () => {
    if (!file || !user) {
      alert("Please select a file first!");
      return;
    }

    setUploading(true);

    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("drive-lite")
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      alert("❌ Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // ✅ Get public URL
    const { data: urlData } = supabase.storage
      .from("drive-lite")
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      alert("❌ Could not generate public URL!");
      setUploading(false);
      return;
    }

    // ✅ Insert record in DB
    const { error: insertError } = await supabase.from("photos").insert([
      {
        name: file.name,
        url: publicUrl,
        user_id: user.id,
        size: Math.round(file.size / 1024), // KB
      },
    ]);

    if (insertError) {
      console.error(insertError);
      alert("❌ Database insert failed: " + insertError.message);
      setUploading(false);
      return;
    }

    alert("✅ File uploaded successfully!");
    setFile(null);
    setUploading(false);
    fetchPhotos();
  };

  // ❌ Delete photo
  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    const path = fileUrl.split("/drive-lite/")[1];
    await supabase.storage.from("drive-lite").remove([path]);
    await supabase.from("photos").delete().eq("id", id);
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
            <h2>Loading Drive Lite</h2>
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
            <div className={styles.breadcrumb}>My Drive</div>
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
            <div className={styles.searchIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search in Drive Lite..."
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
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                New Upload
              </label>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        {file && (
          <div className={styles.uploadCard}>
            <div className={styles.uploadCardHeader}>
              <h3>Upload File</h3>
              <button
                onClick={() => setFile(null)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.uploadCardContent}>
              <div className={styles.fileInfo}>
                <div className={styles.fileDetails}>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={styles.uploadConfirmButton}
              >
                {uploading ? (
                  <>
                    <div className={styles.loadingSpinnerSmall}></div>
                    Uploading...
                  </>
                ) : (
                  "Upload to Drive Lite"
                )}
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
                  <div className={styles.fileActions}>
                    <button
                      className={styles.fileAction}
                      onClick={() => window.open(photo.url, "_blank")}
                      title="View"
                    >
                      👁
                    </button>
                    <button
                      className={styles.fileAction}
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
                      className={`${styles.fileAction} ${styles.deleteAction}`}
                      onClick={() => handleDelete(photo.id, photo.url)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
              <div className={styles.fileInfo}>
                <div className={styles.fileName}>{photo.name}</div>
                <div className={styles.fileMeta}>
                  Uploaded {new Date(photo.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>

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
