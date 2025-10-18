"use client";

import { useEffect, useState } from "react";
import { supabase } from "./../../../lib/supabaseClient";

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
      alert("Food photo uploaded!");
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

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "auto" }}>
      <h1>🍽️ Activity 3 – Food Review App</h1>
      <p style={{ color: "gray" }}>Signed in as {user?.email}</p>

      {/* Upload */}
      <div style={{ marginTop: "1rem" }}>
        <input type="file" accept="image/*" onChange={handleUpload} />
        {uploading && <p>Uploading...</p>}
      </div>

      {/* Search + Sort */}
      <div
        style={{
          marginTop: "1rem",
          display: "flex",
          gap: "1rem",
          justifyContent: "space-between",
        }}
      >
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }}
        />
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as "name" | "created_at");
            fetchPhotos(user.id);
          }}
          style={{ padding: "0.5rem", borderRadius: "6px" }}
        >
          <option value="created_at">Sort by Date</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Food Photos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1.5rem",
          marginTop: "2rem",
        }}
      >
        {filteredPhotos.length === 0 && <p>No food photos found.</p>}
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "1rem",
              backgroundColor: "#fafafa",
            }}
          >
            <img
              src={photo.url}
              alt={photo.name}
              style={{
                width: "100%",
                height: "180px",
                objectFit: "cover",
                borderRadius: "6px",
              }}
            />
            <h3 style={{ marginTop: "0.5rem" }}>{photo.name}</h3>
            <small style={{ color: "gray" }}>
              {new Date(photo.created_at).toLocaleString()}
            </small>

            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <button onClick={() => renamePhoto(photo.id, photo.name)}>Rename</button>
              <button
                style={{ backgroundColor: "red", color: "white" }}
                onClick={() => deletePhoto(photo.id, photo.url)}
              >
                Delete
              </button>
            </div>

            {/* Reviews Section */}
            <div style={{ marginTop: "1rem" }}>
              <h4>Reviews</h4>
              <button onClick={() => addReview(photo.id)}>+ Add Review</button>
              <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: "0.5rem" }}>
                {(reviews[photo.id] || []).map((rev) => (
                  <li
                    key={rev.id}
                    style={{
                      background: "#fff",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #ddd",
                      marginTop: "0.5rem",
                    }}
                  >
                    <p>{rev.content}</p>
                    <small style={{ color: "gray" }}>
                      {new Date(rev.created_at).toLocaleString()}
                    </small>
                    <div style={{ marginTop: "0.25rem" }}>
                      <button
                        onClick={() => editReview(rev.id, rev.content, photo.id)}
                      >
                        Edit
                      </button>
                      <button
                        style={{ marginLeft: "0.5rem", color: "red" }}
                        onClick={() => deleteReview(rev.id, photo.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
