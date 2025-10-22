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
  const [file, setFile] = useState<File | null>(null);
  const [reviewText, setReviewText] = useState("");

  // Fetch reviews for each food photo
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

  // Fetch uploaded photos
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

      for (const photo of data || []) {
        fetchReviews(photo.id);
      }
    },
    [fetchReviews]
  );

  // Initialize user and fetch their photos
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

  // Upload photo and review
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      alert("Please select a photo before submitting.");
      return;
    }

    try {
      const ext = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `food_photos/${user.id}-${timestamp}.${ext}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("drive-lite")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: publicData } = supabase.storage
        .from("drive-lite")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) throw new Error("Failed to get public URL");

      // Save photo record to DB
      const { data: photoData, error: dbError } = await supabase
        .from("food_photos")
        .insert([
          {
            name: file.name,
            url: publicData.publicUrl,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // Save review (optional)
      if (reviewText.trim() !== "") {
        const { error: reviewError } = await supabase.from("reviews").insert([
          {
            content: reviewText,
            food_id: photoData.id,
            user_id: user.id,
          },
        ]);
        if (reviewError) throw reviewError;
      }

      setFile(null);
      setReviewText("");
      await fetchPhotos(user.id);
      alert("Upload and review submitted successfully!");
    } catch (err) {
      if (err instanceof Error) {
        console.error("Upload failed:", err.message);
        alert("Upload failed: " + err.message);
      }
    }
  };

  // Delete photo + related reviews
  const deletePhoto = async (id: string, url: string) => {
    if (!confirm("Delete this photo and all reviews?")) return;
    const path = url.split("/drive-lite/")[1];
    await supabase.storage.from("drive-lite").remove([path]);
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

    if (!error) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
      );
    }
  };

  const filteredPhotos = photos.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <h2>Loading Your Food Gallery</h2>
            <p>Preparing your culinary journey…</p>
          </div>
        </div>
      </div>
    );
  }

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
        <form className={styles.uploadSection} onSubmit={handleUpload}>
          <label className={styles.uploadButton}>
            📸 Choose Food Photo
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ display: "none" }}
            />
          </label>
          <textarea
            className={styles.reviewInput}
            placeholder="Write your food review…"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <button type="submit" className={styles.submitButton}>
            🚀 Upload & Post Review
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
            <div className={styles.statIcon}>📝</div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>
                {Object.values(reviews).flat().length}
              </div>
              <div className={styles.statLabel}>Total Reviews</div>
            </div>
          </div>
        </div>

        {/* Food Gallery */}
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
                  <div className={styles.foodActions}>
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
              </div>
              <div className={styles.foodContent}>
                <div className={styles.foodHeader}>
                  <h3 className={styles.foodName}>{photo.name}</h3>
                  <span className={styles.foodDate}>
                    {new Date(photo.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Reviews Section */}
                <div className={styles.reviewsSection}>
                  <div className={styles.reviewsHeader}>
                    <h4 className={styles.reviewsTitle}>Reviews</h4>
                  </div>
                  {reviews[photo.id]?.length > 0 ? (
                    <div className={styles.reviewsList}>
                      {reviews[photo.id].map((review) => (
                        <div key={review.id} className={styles.reviewItem}>
                          <p className={styles.reviewContent}>
                            {review.content}
                          </p>
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
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🍽️</div>
            <h3>No Food Photos Yet</h3>
            <p>Upload your first food photo to get started!</p>
          </div>
        )}

        {/* Back Button */}
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