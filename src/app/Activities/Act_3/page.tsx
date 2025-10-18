"use client";

import { useEffect, useState } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import styles from "./../../../CSS/activities.module.css";

interface FoodPhoto {
  id: string;
  name: string;
  url: string;
  user_id: string;
  created_at: string;
}

interface Review {
  id: string;
  food_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function Act3Page() {
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<FoodPhoto[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gallery" | "recent">("gallery");

  // Fetch user and food photos
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/";
        return;
      }
      setUser(data.user);
      fetchPhotos(data.user.id);
    };
    init();
  }, []);

  // Fetch food photos
  const fetchPhotos = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("food_photos")
      .select("*")
      .eq("user_id", userId)
      .order(sortBy, { ascending: sortBy === "name" });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setPhotos(data || []);
    setLoading(false);

    // Load reviews for each photo
    for (const photo of data || []) {
      fetchReviews(photo.id);
    }
  };

  // Upload photo
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setUploading(true);
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("food-photos")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("food_photos").insert([
        {
          name: file.name,
          url: publicUrl.publicUrl,
          user_id: user.id,
        },
      ]);

      if (insertError) throw insertError;

      fetchPhotos(user.id);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Delete photo
  const deletePhoto = async (id: string, url: string) => {
    if (!confirm("Delete this photo and all reviews?")) return;

    const filePath = url.split("/food-photos/")[1];
    await supabase.storage.from("food-photos").remove([filePath]);
    await supabase.from("reviews").delete().eq("food_id", id);
    await supabase.from("food_photos").delete().eq("id", id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Rename photo
  const renamePhoto = async (id: string, oldName: string) => {
    const newName = prompt("New photo name:", oldName);
    if (!newName || newName === oldName) return;

    const { error } = await supabase
      .from("food_photos")
      .update({ name: newName })
      .eq("id", id);

    if (error) alert("Rename failed");
    else setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  };

  // Fetch reviews for a specific food photo
  const fetchReviews = async (foodId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("food_id", foodId)
      .order("created_at", { ascending: false });

    if (error) console.error("Error loading reviews:", error);
    else setReviews((prev) => ({ ...prev, [foodId]: data || [] }));
  };

  // Add a review
  const addReview = async (foodId: string) => {
    const content = prompt("Enter your review:");
    if (!content) return;

    const { error } = await supabase.from("reviews").insert([
      { content, food_id: foodId, user_id: user.id },
    ]);

    if (error) alert("Failed to add review");
    else fetchReviews(foodId);
  };

  // Edit review
  const editReview = async (id: string, oldContent: string, foodId: string) => {
    const newContent = prompt("Edit your review:", oldContent);
    if (!newContent || newContent === oldContent) return;

    const { error } = await supabase
      .from("reviews")
      .update({ content: newContent })
      .eq("id", id);

    if (error) alert("Update failed");
    else fetchReviews(foodId);
  };

  // Delete review
  const deleteReview = async (id: string, foodId: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) alert("Delete failed");
    else fetchReviews(foodId);
  };

  // Filter + sort photos
  const filteredPhotos = photos
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  // Get recent reviews
  const recentReviews = Object.values(reviews)
    .flat()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <h2>Loading Food Gallery</h2>
          <p>Preparing your culinary journey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} style={{ maxWidth: "1200px" }}>
        {/* Header Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8C18 10.2091 16.2091 12 14 12C11.7909 12 10 10.2091 10 8C10 5.79086 11.7909 4 14 4C16.2091 4 18 5.79086 18 8Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 8C6 10.2091 4.20914 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 16C18 18.2091 16.2091 20 14 20C11.7909 20 10 18.2091 10 16C10 13.7909 11.7909 12 14 12C16.2091 12 18 13.7909 18 16Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 16C6 18.2091 4.20914 20 2 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className={styles.heroTitle}>Food Review App</h1>
          <p className={styles.heroSubtitle}>Share your culinary experiences and discover new flavors</p>
          <div className={styles.userBadge}>
            <span className={styles.userAvatar}>{user?.email?.charAt(0).toUpperCase()}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className={styles.statsOverview}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L8.5 11.5C9.5 10.5 11 10.5 12 11.5L16 15.5C17 16.5 18.5 16.5 19.5 15.5L20 15M4 16V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V16M4 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 8C15 9.65685 13.6569 11 12 11C10.3431 11 9 9.65685 9 8C9 6.34315 10.3431 5 12 5C13.6569 5 15 6.34315 15 8Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{photos.length}</div>
              <div className={styles.statLabel}>Food Photos</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 11.5C21 16.194 16.194 21 11.5 21C6.806 21 2 16.194 2 11.5C2 6.806 6.806 2 11.5 2C16.194 2 21 6.806 21 11.5Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M15 11.5L10.5 9V14L15 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{Object.values(reviews).flat().length}</div>
              <div className={styles.statLabel}>Total Reviews</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 3C12.3284 3 13 3.67157 13 4.5V11.5H20C20.8284 11.5 21.5 12.1716 21.5 13C21.5 13.8284 20.8284 14.5 20 14.5H13V21.5C13 22.3284 12.3284 23 11.5 23C10.6716 23 10 22.3284 10 21.5V14.5H3C2.17157 14.5 1.5 13.8284 1.5 13C1.5 12.1716 2.17157 11.5 3 11.5H10V4.5C10 3.67157 10.6716 3 11.5 3Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{filteredPhotos.length}</div>
              <div className={styles.statLabel}>Showing</div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* Left Sidebar */}
          <div className={styles.sidebar}>
            {/* Upload Section */}
            <div className={styles.uploadCard}>
              <h3 className={styles.sidebarTitle}>Add New Food</h3>
              <label className={styles.uploadArea}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUpload} 
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <div className={styles.uploadIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16V8M9 11L12 8L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 16V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 8L12 4L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.uploadText}>
                  <div className={styles.uploadTitle}>
                    {uploading ? "Uploading..." : "Upload Food Photo"}
                  </div>
                  <div className={styles.uploadSubtitle}>PNG, JPG up to 10MB</div>
                </div>
              </label>
            </div>

            {/* Recent Reviews */}
            <div className={styles.recentReviewsCard}>
              <h3 className={styles.sidebarTitle}>Recent Reviews</h3>
              <div className={styles.recentReviewsList}>
                {recentReviews.length === 0 ? (
                  <div className={styles.noRecentReviews}>
                    No reviews yet. Add your first review!
                  </div>
                ) : (
                  recentReviews.map((review, index) => (
                    <div key={review.id} className={styles.recentReviewItem}>
                      <div className={styles.reviewPreview}>{review.content}</div>
                      <div className={styles.reviewTime}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Gallery */}
          <div className={styles.gallerySection}>
            {/* Search and Controls */}
            <div className={styles.galleryHeader}>
              <div className={styles.searchContainer}>
                <div className={styles.searchBox}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search food photos..."
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
                  <option value="created_at">Newest First</option>
                  <option value="name">A to Z</option>
                </select>
              </div>

              <div className={styles.viewControls}>
                <button 
                  className={`${styles.viewButton} ${activeTab === 'gallery' ? styles.viewButtonActive : ''}`}
                  onClick={() => setActiveTab('gallery')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3H10V10H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 3H21V10H14V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 14H21V21H14V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 14H10V21H3V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Gallery
                </button>
                <button 
                  className={`${styles.viewButton} ${activeTab === 'recent' ? styles.viewButtonActive : ''}`}
                  onClick={() => setActiveTab('recent')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Recent
                </button>
              </div>
            </div>

            {/* Food Photos Grid */}
            <div className={styles.foodGrid}>
              {filteredPhotos.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.5 11.5C9.5 10.5 11 10.5 12 11.5L16 15.5C17 16.5 18.5 16.5 19.5 15.5L20 15M4 16V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V16M4 16H20" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 8C15 9.65685 13.6569 11 12 11C10.3431 11 9 9.65685 9 8C9 6.34315 10.3431 5 12 5C13.6569 5 15 6.34315 15 8Z" stroke="#9ca3af" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3>No Food Photos Yet</h3>
                  <p>Start by uploading your first food photo to share with the community!</p>
                </div>
              ) : (
                filteredPhotos.map((photo) => (
                  <div key={photo.id} className={styles.foodCard}>
                    <div className={styles.foodImage}>
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className={styles.foodImg}
                      />
                      <div className={styles.foodOverlay}>
                        <div className={styles.foodActions}>
                          <button 
                            onClick={() => renamePhoto(photo.id, photo.name)}
                            className={styles.foodAction}
                            title="Rename"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            onClick={() => deletePhoto(photo.id, photo.url)}
                            className={`${styles.foodAction} ${styles.deleteAction}`}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.foodContent}>
                      <div className={styles.foodHeader}>
                        <h3 className={styles.foodName}>{photo.name}</h3>
                        <div className={styles.foodDate}>
                          {new Date(photo.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Reviews Section */}
                      <div className={styles.reviewsSection}>
                        <div className={styles.reviewsHeader}>
                          <h4 className={styles.reviewsTitle}>
                            Reviews ({reviews[photo.id]?.length || 0})
                          </h4>
                          <button 
                            onClick={() => addReview(photo.id)}
                            className={styles.addReviewButton}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Add Review
                          </button>
                        </div>
                        
                        <div className={styles.reviewsList}>
                          {(reviews[photo.id] || []).slice(0, 3).map((rev) => (
                            <div key={rev.id} className={styles.reviewCard}>
                              <div className={styles.reviewContent}>{rev.content}</div>
                              <div className={styles.reviewFooter}>
                                <div className={styles.reviewDate}>
                                  {new Date(rev.created_at).toLocaleDateString()}
                                </div>
                                <div className={styles.reviewActions}>
                                  <button 
                                    onClick={() => editReview(rev.id, rev.content, photo.id)}
                                    className={styles.reviewAction}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => deleteReview(rev.id, photo.id)}
                                    className={`${styles.reviewAction} ${styles.reviewDelete}`}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {(reviews[photo.id] || []).length === 0 && (
                            <div className={styles.noReviews}>
                              No reviews yet. Be the first to share your thoughts!
                            </div>
                          )}
                          
                          {(reviews[photo.id] || []).length > 3 && (
                            <div className={styles.moreReviews}>
                              +{(reviews[photo.id] || []).length - 3} more reviews
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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