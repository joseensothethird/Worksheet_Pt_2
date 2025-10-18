"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import styles from "@/app/CSS/Home.module.css";

interface Review {
  id: string;
  pokemon_name: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function PokemonReviewApp() {
  const [user, setUser] = useState<any>(null);
  const [pokemon, setPokemon] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [sortOption, setSortOption] = useState("date_desc");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) return alert("Enter Pokémon name!");
    setLoading(true);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${search.toLowerCase()}`);
      if (!res.ok) throw new Error("Pokémon not found!");
      const data = await res.json();
      setPokemon(data);
      await fetchReviews(search.toLowerCase());
    } catch (err) {
      alert("Pokémon not found!");
      setPokemon(null);
      setReviews([]);
    }
    setLoading(false);
  };

  const fetchReviews = async (pokemonName: string) => {
    const { data, error } = await supabase
      .from("pokemon_reviews")
      .select("*")
      .eq("pokemon_name", pokemonName)
      .order("created_at", { ascending: false });

    if (!error && data) setReviews(data);
  };

  const handleAddReview = async () => {
    if (!newReview.trim() || !pokemon) return;
    const { error } = await supabase.from("pokemon_reviews").insert([
      {
        pokemon_name: pokemon.name,
        user_id: user.id,
        content: newReview.trim(),
      },
    ]);
    if (error) {
      console.error(error);
      alert("Failed to add review");
    } else {
      setNewReview("");
      await fetchReviews(pokemon.name);
    }
  };

  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("pokemon_reviews").delete().eq("id", id);
    if (error) console.error(error);
    else await fetchReviews(pokemon.name);
  };

  const handleUpdateReview = async (id: string, content: string) => {
    const updated = prompt("Edit your review:", content);
    if (!updated || updated === content) return;
    const { error } = await supabase.from("pokemon_reviews").update({ content: updated }).eq("id", id);
    if (error) console.error(error);
    else await fetchReviews(pokemon.name);
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOption === "name_asc") return a.content.localeCompare(b.content);
    if (sortOption === "name_desc") return b.content.localeCompare(a.content);
    if (sortOption === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className={styles.container} style={{ padding: "2rem" }}>
      <h1>🐉 Pokémon Review App</h1>
      <p>Search Pokémon and write your own reviews.</p>

      <div style={{ marginTop: "1rem", display: "flex", gap: "10px" }}>
        <input
          type="text"
          placeholder="Search Pokémon by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>

      {loading && <p>Loading...</p>}

      {pokemon && (
        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <h2>{pokemon.name.toUpperCase()}</h2>
          <img
            src={pokemon.sprites.front_default}
            alt={pokemon.name}
            width={150}
            height={150}
          />
        </div>
      )}

      {pokemon && (
        <div style={{ marginTop: "2rem" }}>
          <h3>🗒️ Reviews for {pokemon.name}</h3>

          <div style={{ marginBottom: "1rem" }}>
            <textarea
              placeholder="Write a review..."
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
            />
            <button onClick={handleAddReview}>Add Review</button>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label>Sort by: </label>
            <select onChange={(e) => setSortOption(e.target.value)} value={sortOption}>
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="name_asc">A-Z</option>
              <option value="name_desc">Z-A</option>
            </select>
          </div>

          {sortedReviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            sortedReviews.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                }}
              >
                <p>{r.content}</p>
                <small>{new Date(r.created_at).toLocaleString()}</small>
                {r.user_id === user?.id && (
                  <div style={{ marginTop: "5px" }}>
                    <button onClick={() => handleUpdateReview(r.id, r.content)}>Edit</button>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      style={{ marginLeft: "10px", color: "red" }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
