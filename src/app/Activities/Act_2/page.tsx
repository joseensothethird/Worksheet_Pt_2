"use client";

import { useEffect, useState } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import styles from "./../../../CSS/google.module.css";
interface Photo {
  id: string;
  name: string;
  url: string;
  created_at: string;
  user_id: string;
}

export default function Act2Page() {
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Fetch user on load
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/";
        return;
      }
      setUser(data.user);
      fetchPhotos(data.user.id);
    };
    getUser();
  }, []);

  // Fetch user's photos
  const fetchPhotos = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .eq("user_id", userId)
      .order(sortBy, { ascending: sortBy === "name" });

    if (error) console.error("Error fetching photos:", error);
    else setPhotos(data || []);
    setLoading(false);
  };

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("drive-lite")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("drive-lite")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("photos").insert([
        {
          name: file.name,
          url: publicUrl.publicUrl,
          user_id: user.id,
        },
      ]);

      if (insertError) throw insertError;

      fetchPhotos(user.id);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const deletePhoto = async (id: string, url: string) => {
    if (!confirm("Delete this photo?")) return;

    const filePath = url.split("/drive-lite/")[1];
    await supabase.storage.from("drive-lite").remove([filePath]);
    await supabase.from("photos").delete().eq("id", id);

    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Rename photo
  const renamePhoto = async (id: string, oldName: string) => {
    const newName = prompt("Enter new name:", oldName);
    if (!newName || newName === oldName) return;

    const { error } = await supabase.from("photos").update({ name: newName }).eq("id", id);
    if (error) {
      console.error("Rename failed:", error);
      alert("Rename failed.");
    } else {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
      );
    }
  };

  // Filtered + sorted photos
  const filteredPhotos = photos
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <h2>Loading...</h2>
          <p>Please wait while we load your files</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} style={{ maxWidth: "900px" }}>
        {/* Header Section */}
        <div className={styles.welcomeSection}>
          <div className={styles.icon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 15C3 17.2091 4.79086 19 7 19H17C19.2091 19 21 17.2091 21 15V9C21 6.79086 19.2091 5 17 5H7C4.79086 5 3 6.79086 3 9V15Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Google Drive Lite</h1>
          <p className={styles.welcomeText}>Cloud file management</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        {/* Upload Section */}
        <div className={styles.section}>
          <div className={styles.uploadSection}>
            <label className={styles.uploadButton}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleUpload} 
                style={{ display: 'none' }}
                disabled={uploading}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {uploading ? "Uploading..." : "Upload Image"}
            </label>
            {uploading && (
              <div className={styles.statusMessage} style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1' }}>
                Uploading your file...
              </div>
            )}
          </div>
        </div>

        {/* Search + Sort */}
        <div className={styles.section}>
          <div className={styles.searchSortContainer}>
            <div className={styles.searchBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as "name" | "created_at");
                fetchPhotos(user.id);
              }}
              className={styles.sortSelect}
            >
              <option value="created_at">Sort by Date</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{photos.length}</div>
            <div className={styles.statLabel}>Total Files</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {filteredPhotos.length}
            </div>
            <div className={styles.statLabel}>Showing</div>
          </div>
        </div>

        {/* Gallery */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Files</h3>
          {filteredPhotos.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No files found. Upload your first image to get started!</p>
            </div>
          ) : (
            <div className={styles.galleryGrid}>
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className={styles.photoCard}>
                  <div className={styles.photoImage}>
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className={styles.photoImg}
                    />
                    <div className={styles.photoOverlay}>
                      <button 
                        onClick={() => renamePhoto(photo.id, photo.name)}
                        className={styles.photoAction}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        onClick={() => deletePhoto(photo.id, photo.url)}
                        className={`${styles.photoAction} ${styles.deleteAction}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className={styles.photoInfo}>
                    <div className={styles.photoName}>{photo.name}</div>
                    <div className={styles.photoDate}>
                      {new Date(photo.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.backButton}
            onClick={() => window.history.back()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}