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
  content: string | null;
  rating: number;
  created_at: string;
}

export default function FoodReviewApp() {
  const [user, setUser] = useState<User | null>(null);
  const [photos, setPhotos] = useState<FoodPhoto[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [uploading, setUploading] = useState(false);

  // 🔹 Fetch reviews for a food photo
  const fetchReviews = useCallback(async (foodId: string) => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("food_id", foodId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews((prev) => ({ ...prev, [foodId]: data }));
    } else if (error) {
      console.error("Fetch reviews error:", error.message);
    }
  }, []);

  // 🔹 Fetch user's uploaded photos
  const fetchPhotos = useCallback(
    async (userId: string) => {
      setLoading(true);
      const { data, error } = await supabase
        .from("food_photos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch photos error:", error.message);
        setLoading(false);
        return;
      }

      setPhotos(data || []);
      setLoading(false);

      // Fetch reviews for each photo
      for (const photo of data || []) {
        fetchReviews(photo.id);
      }
    },
    [fetchReviews]
  );

  // 🔹 Initialize session
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

  // 🔹 Handle upload of photo + review
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      alert("Please select a photo before submitting.");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `food_photos/${user.id}-${timestamp}.${ext}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("drive-lite")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("drive-lite")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL.");

      // Insert photo record
      const { data: photoData, error: dbError } = await supabase
        .from("food_photos")
        .insert([
          {
            name: file.name,
            url: publicUrl,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Insert review if rating or text present
      if (reviewText.trim() !== "" || rating > 0) {
        const { error: reviewError } = await supabase.from("reviews").insert([
          {
            content: reviewText.trim() || null,
            rating,
            food_id: photoData.id,
            user_id: user.id,
          },
        ]);
        if (reviewError) throw reviewError;
      }

      // Reset form and refresh UI
      setFile(null);
      setReviewText("");
      setRating(0);
      await fetchPhotos(user.id);
      alert("✅ Upload and review submitted successfully!");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Delete photo + related reviews
  const deletePhoto = async (id: string, url: string) => {
    if (!confirm("Delete this photo and all related reviews?")) return;
    const path = url.split("/drive-lite/")[1];
    await supabase.storage.from("drive-lite").remove([path]);
    await supabase.from("food_photos").delete().eq("id", id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // 🔹 Rename photo
  const renamePhoto = async (id: string, oldName: string) => {
    const newName = prompt("Enter new photo name:", oldName);
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

  // 🔹 Star Rating Component
  const StarRating = ({
    currentRating,
    onRatingChange,
    readonly = false,
  }: {
    currentRating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
  }) => (
    <div className={styles.starRating}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${styles.star} ${
            star <= (hoverRating || currentRating) ? styles.filled : ""
          } ${readonly ? styles.readonly : ""}`}
          onClick={() => !readonly && onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          ★
        </span>
      ))}
    </div>
  );

  // 🔹 Average rating per food
  const getAverageRating = (foodId: string) => {
    const foodReviews = reviews[foodId] || [];
    if (foodReviews.length === 0) return 0;
    const total = foodReviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / foodReviews.length).toFixed(1);
  };

  const filteredPhotos = photos.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 🔹 Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <h2>Loading your food gallery…</h2>
        </div>
      </div>
    );
  }

  // 🔹 Main Render
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Hero Section */}
        <div className={styles.heroSection}>
          <div className={styles.heroIcon}>🍱</div>
          <h1 className={styles.heroTitle}>Food Review App</h1>
          <p className={styles.heroSubtitle}>
            Capture, share, and rate your favorite dishes!
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

        {/* Upload Form */}
        <form className={styles.uploadSection} onSubmit={handleUpload}>
          <label className={styles.uploadButton}>
            Choose Food Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </label>

          <div className={styles.ratingSection}>
            <label className={styles.ratingLabel}>Rate this food:</label>
            <StarRating currentRating={rating} onRatingChange={setRating} />
            {rating > 0 && (
              <span className={styles.ratingText}>
                {rating} star{rating !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <textarea
            className={styles.reviewInput}
            placeholder="Write your food review… (optional)"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload & Post Review"}
          </button>
        </form>

        {/* Stats Overview */}
        <div className={styles.statsOverview}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>📸</div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{photos.length}</div>
              <div className={styles.statLabel}>Food Photos</div>
            </div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>⭐</div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>
                {Object.values(reviews).flat().length}
              </div>
              <div className={styles.statLabel}>Total Reviews</div>
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
                  unoptimized
                />
                <div className={styles.foodOverlay}>
                  <button
                    className={styles.foodAction}
                    onClick={() => renamePhoto(photo.id, photo.name)}
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${styles.foodAction} ${styles.deleteAction}`}
                    onClick={() => deletePhoto(photo.id, photo.url)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className={styles.foodContent}>
                <h3 className={styles.foodName}>{photo.name}</h3>
                <div className={styles.foodMeta}>
                  <span className={styles.foodDate}>
                    {new Date(photo.created_at).toLocaleDateString()}
                  </span>
                  {reviews[photo.id]?.length > 0 && (
                    <div className={styles.foodRating}>
                      ⭐ {getAverageRating(photo.id)} (
                      {reviews[photo.id].length} review
                      {reviews[photo.id].length !== 1 ? "s" : ""})
                    </div>
                  )}
                </div>

                {/* Reviews */}
                <div className={styles.reviewsSection}>
                  {reviews[photo.id]?.length > 0 ? (
                    reviews[photo.id].map((review) => (
                      <div key={review.id} className={styles.reviewItem}>
                        <div className={styles.reviewHeader}>
                          <StarRating currentRating={review.rating} readonly />
                          <small className={styles.reviewDate}>
                            {new Date(
                              review.created_at
                            ).toLocaleDateString()}
                          </small>
                        </div>
                        {review.content && (
                          <p className={styles.reviewContent}>
                            {review.content}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className={styles.noReviews}>No reviews yet</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>No Food Photos Yet</h3>
            <p>Upload your first dish and share your review!</p>
          </div>
        )}

        <div className={styles.actionButtons}>
          <button
            className={styles.backButton}
            onClick={() => (window.location.href = "/")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
