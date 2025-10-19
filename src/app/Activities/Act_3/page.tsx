"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import Image from "next/image";
import styles from "./../../../CSS/food_review.module.css";
import type { User } from "@supabase/supabase-js";

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

export default function FoodReviewApp() {
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<FoodPhoto[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async (foodId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("food_id", foodId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews((prev) => ({ ...prev, [foodId]: data }));
    }
  }, []);

  const fetchPhotos = useCallback(
    async (userId: string) => {
      setLoading(true);
      const { data, error } = await supabase
        .from("food_photos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setPhotos(data || []);
      setLoading(false);

      for (const photo of data || []) fetchReviews(photo.id);
    },
    [fetchReviews]
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.location.href = "/";
        return;
      }
      setUser(data.user);
      await fetchPhotos(data.user.id);
    };
    init();
  }, [fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) {
        alert("No file or user found.");
        return;
      }

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("food-photos")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl)
        throw new Error("Failed to get public URL");

      const { error: dbError } = await supabase.from("food_photos").insert([
        {
          name: file.name,
          url: publicData.publicUrl,
          user_id: user.id,
        },
      ]);

      if (dbError) throw dbError;

      await fetchPhotos(user.id);
      alert("Upload successful!");
    } catch (err) {
      if (err instanceof Error) {
        console.error("Upload failed:", err.message);
        alert("Upload failed: " + err.message);
      }
    }
  };

  const deletePhoto = async (id: string, url: string) => {
    if (!confirm("Delete this photo and all reviews?")) return;
    const path = url.split("/food-photos/")[1];
    await supabase.storage.from("food-photos").remove([path]);
    await supabase.from("food_photos").delete().eq("id", id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const renamePhoto = async (id: string, oldName: string) => {
    const newName = prompt("New photo name:", oldName);
    if (!newName || newName === oldName) return;

    const { error } = await supabase
      .from("food_photos")
      .update({ name: newName })
      .eq("id", id);

    if (!error) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
      );
    }
  };

  const addReview = async (foodId: string) => {
    const content = prompt("Enter your review:");
    if (!content || !user) return;

    const { error } = await supabase.from("reviews").insert([
      { content, food_id: foodId, user_id: user.id },
    ]);

    if (!error) fetchReviews(foodId);
  };

  const filteredPhotos = photos
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  if (loading)
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <h2>Loading Your Food Gallery</h2>
        <p>Preparing your culinary journey...</p>
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroIcon}>
            <span style={{ fontSize: "32px" }}>🍱</span>
          </div>
          <h1 className={styles.heroTitle}>Food Review App</h1>
          <p className={styles.heroSubtitle}>
            Capture, share, and review your culinary adventures
          </p>
          {user && (
            <div className={styles.userBadge}>
              <div className={styles.userAvatar}>
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className={styles.uploadSection}>
          <label className={styles.uploadButton}>
            📸 Upload Food Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {/* Stats Overview */}
        <div className={styles.statsOverview}>
          <div className={styles.statItem}>
            <span>📸</span>
            <div>
              <div className={styles.statNumber}>{photos.length}</div>
              <div className={styles.statLabel}>Food Photos</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <span>📝</span>
            <div>
              <div className={styles.statNumber}>
                {Object.values(reviews).flat().length}
              </div>
              <div className={styles.statLabel}>Total Reviews</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <span>⭐</span>
            <div>
              <div className={styles.statNumber}>
                {photos.length > 0
                  ? (Object.values(reviews).flat().length / photos.length).toFixed(1)
                  : "0.0"}
              </div>
              <div className={styles.statLabel}>Avg Reviews per Photo</div>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className={styles.foodGrid}>
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className={styles.foodCard}>
              <div className={styles.foodImage}>
                <Image
                  src={photo.url}
                  alt={photo.name}
                  width={500}
                  height={400}
                  className={styles.foodImg}
                />
                <div className={styles.foodOverlay}>
                  <button
                    className={styles.foodAction}
                    onClick={() => renamePhoto(photo.id, photo.name)}
                  >
                    ✏️
                  </button>
                  <button
                    className={styles.foodAction}
                    onClick={() => deletePhoto(photo.id, photo.url)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className={styles.foodContent}>
                <h3>{photo.name}</h3>
                
                {/* Reviews Section */}
                <div className={styles.reviewsSection}>
                  <h4>Reviews:</h4>
                  {reviews[photo.id]?.length > 0 ? (
                    <div className={styles.reviewsList}>
                      {reviews[photo.id].map((review) => (
                        <div key={review.id} className={styles.reviewItem}>
                          <p className={styles.reviewContent}>{review.content}</p>
                          <small className={styles.reviewDate}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noReviews}>No reviews yet</p>
                  )}
                </div>

                <button
                  className={styles.addReviewButton}
                  onClick={() => addReview(photo.id)}
                >
                  + Add Review
                </button>
              </div>
            </div>
          ))}
        </div>

        {photos.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>No Food Photos Yet</h3>
            <p>Upload your first food photo to get started!</p>
          </div>
        )}

        <button
          className={styles.backButton}
          onClick={() => (window.location.href = "/")}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}