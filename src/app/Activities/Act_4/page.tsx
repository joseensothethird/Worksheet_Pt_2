"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { supabase } from "./../../../lib/supabaseClient";
import styles from "./../../../CSS/pokemon.module.css";

interface Review {
  id: string;
  pokemon_name: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface PokemonType {
  type: {
    name: string;
  };
}

interface PokemonData {
  id: number;
  name: string;
  types: PokemonType[];
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string | null;
    other?: {
      ["official-artwork"]?: {
        front_default: string | null;
      };
    };
  };
}

interface SupabaseUser {
  id: string;
  email: string;
}

export default function PokemonReviewApp() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [pokemon, setPokemon] = useState<PokemonData | null>(null);
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalReviews: 0, reviewedPokemon: 0 });
  const [userPokemonList, setUserPokemonList] = useState<string[]>([]);
  const [pokemonImages, setPokemonImages] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch Stats and Reviewed Pokémon
  const fetchStats = useCallback(async () => {
    if (!user) return;

    const { data: reviewsData } = await supabase.from("pokemon_reviews").select("pokemon_name");
    const { data: pokemonData } = await supabase
      .from("pokemon_reviews")
      .select("pokemon_name")
      .eq("user_id", user.id);

    const uniqueUserPokemon = [...new Set(pokemonData?.map((p) => p.pokemon_name))];

    setStats({
      totalReviews: reviewsData?.length || 0,
      reviewedPokemon: uniqueUserPokemon.length || 0,
    });

    setUserPokemonList(uniqueUserPokemon);
  }, [user]);

  // Fetch User
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? "" });
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  // Fetch Pokémon Images
  useEffect(() => {
    const fetchImages = async () => {
      const imageMap: Record<string, string> = {};
      for (const name of userPokemonList) {
        try {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
          if (res.ok) {
            const data = await res.json();
            imageMap[name] =
              data.sprites.other?.["official-artwork"]?.front_default ||
              data.sprites.front_default ||
              "/placeholder.png";
          } else {
            imageMap[name] = "/placeholder.png";
          }
        } catch {
          imageMap[name] = "/placeholder.png";
        }
      }
      setPokemonImages(imageMap);
    };
    if (userPokemonList.length > 0) fetchImages();
  }, [userPokemonList]);

  // Fetch Reviews
  const fetchReviews = useCallback(async (pokemonName: string) => {
    if (!pokemonName) return;
    const { data, error } = await supabase
      .from("pokemon_reviews")
      .select("*")
      .eq("pokemon_name", pokemonName)
      .order("created_at", { ascending: false });

    if (!error && data) setReviews(data);
  }, []);

  // Open Modal with Pokémon details
  const openPokemonModal = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
      if (!res.ok) throw new Error("Pokémon not found!");
      const data: PokemonData = await res.json();
      setPokemon(data);
      await fetchReviews(data.name);
      setModalOpen(true);
    } catch {
      alert("Pokémon not found!");
      setPokemon(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Add Review
  const handleAddReview = async () => {
    if (!newReview.trim() || !pokemon) return;
    const { error } = await supabase.from("pokemon_reviews").insert([
      { pokemon_name: pokemon.name, user_id: user?.id, content: newReview.trim() },
    ]);
    if (!error) {
      setNewReview("");
      fetchReviews(pokemon.name);
    } else {
      alert("Failed to add review: " + error.message);
    }
  };

  // Delete Review
  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("pokemon_reviews").delete().eq("id", id);
    if (!error && pokemon) fetchReviews(pokemon.name);
  };

  // Update Review
  const handleUpdateReview = async (id: string, content: string) => {
    const updated = prompt("Edit your review:", content);
    if (!updated || updated === content) return;
    const { error } = await supabase
      .from("pokemon_reviews")
      .update({ content: updated })
      .eq("id", id);
    if (!error && pokemon) fetchReviews(pokemon.name);
  };

  // Sorting Reviews
  const sortedReviews = [...reviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Type Colors
  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      normal: "#A8A878", fire: "#F08030", water: "#6890F0",
      electric: "#F8D030", grass: "#78C850", ice: "#98D8D8",
      fighting: "#C03028", poison: "#A040A0", ground: "#E0C068",
      flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
      rock: "#B8A038", ghost: "#705898", dragon: "#7038F8",
      dark: "#705848", steel: "#B8B8D0", fairy: "#EE99AC",
    };
    return typeColors[type] || "#68A090";
  };

  // Loading UI
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <h2>Searching Pokémon...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} style={{ maxWidth: "800px" }}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.title}>Pokémon Review</h1>
          <p className={styles.welcomeText}>Explore Pokémon database</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.totalReviews}</div>
            <div className={styles.statLabel}>Total Reviews</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.reviewedPokemon}</div>
            <div className={styles.statLabel}>Reviewed Pokémon</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.searchSortContainer}>
            <input
              type="text"
              placeholder="Search Pokémon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openPokemonModal(search)}
              className={styles.searchInput}
            />
            <button
              onClick={() => openPokemonModal(search)}
              className={styles.searchButton}
            >
              Search
            </button>
          </div>
        </div>

        {userPokemonList.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Your Reviewed Pokémon</h3>
            <div className={styles.pokemonList}>
              {userPokemonList.map((name) => (
                <button
                  key={name}
                  onClick={() => openPokemonModal(name)}
                  className={styles.pokemonListItem}
                >
                  <Image
                    src={pokemonImages[name] || "/placeholder.png"}
                    alt={name}
                    width={80}
                    height={80}
                    className={styles.pokemonIcon}
                  />
                  <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className={styles.actionButtons}>
          <button
            onClick={() => window.history.back()}
            className={styles.backButton}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

   {/* Modal */}
{modalOpen && pokemon && (
  <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
    <div
      className={styles.modalContent}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className={styles.modalClose}
        onClick={() => setModalOpen(false)}
      >
        &times;
      </button>

      <div className={styles.modalPokemonCard}>
        <div className={styles.modalPokemonHeader}>
          <h2 className={styles.modalPokemonName}>
            #{pokemon.id} {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
          </h2>
          <div className={styles.modalPokemonTypes}>
            {pokemon.types.map((t, i) => (
              <span
                key={i}
                style={{ backgroundColor: getTypeColor(t.type.name) }}
                className={styles.modalPokemonType}
              >
                {t.type.name}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.modalPokemonImage}>
          <Image
            src={
              pokemon.sprites.other?.["official-artwork"]?.front_default ||
              pokemon.sprites.front_default ||
              "/placeholder.png"
            }
            alt={pokemon.name}
            width={160}
            height={160}
            priority
          />
        </div>

        <div className={styles.modalPokemonStats}>
          <div className={styles.modalStatsGrid}>
            <div className={styles.modalStatItem}>
              <span className={styles.modalStatLabel}>Height</span>
              <span className={styles.modalStatValue}>{(pokemon.height / 10).toFixed(1)} m</span>
            </div>
            <div className={styles.modalStatItem}>
              <span className={styles.modalStatLabel}>Weight</span>
              <span className={styles.modalStatValue}>{(pokemon.weight / 10).toFixed(1)} kg</span>
            </div>
            <div className={styles.modalStatItem}>
              <span className={styles.modalStatLabel}>Base Exp</span>
              <span className={styles.modalStatValue}>{pokemon.base_experience}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalAddReview}>
          <h3>Add Your Review</h3>
          <textarea
            className={styles.modalTextarea}
            placeholder="Write your review..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            rows={3}
          />
          <button
            className={styles.modalSaveButton}
            onClick={handleAddReview}
            disabled={!newReview.trim()}
          >
            Add Review
          </button>
        </div>

        <div className={styles.modalReviews}>
          <h3>Reviews</h3>
          {sortedReviews.length === 0 ? (
            <div className={styles.modalEmptyState}>
              <p>No reviews yet. Be the first to review!</p>
            </div>
          ) : (
            sortedReviews.map((r) => (
              <div key={r.id} className={styles.modalReviewCard}>
                <div className={styles.modalReviewContent}>{r.content}</div>
                <div className={styles.modalReviewFooter}>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  {r.user_id === user?.id && (
                    <div className={styles.modalReviewActions}>
                      <button 
                        className={styles.modalReviewAction}
                        onClick={() => handleUpdateReview(r.id, r.content)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className={`${styles.modalReviewAction} ${styles.modalDeleteAction}`}
                        onClick={() => handleDeleteReview(r.id)}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
