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
  const [sortOption, setSortOption] = useState("date_desc");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalReviews: 0, reviewedPokemon: 0 });
  const [userPokemonList, setUserPokemonList] = useState<string[]>([]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const { data: reviewsData } = await supabase
      .from("pokemon_reviews")
      .select("pokemon_name");

    const { data: pokemonData } = await supabase
      .from("pokemon_reviews")
      .select("pokemon_name")
      .eq("user_id", user.id);

    const uniqueUserPokemon = [
      ...new Set(pokemonData?.map((p) => p.pokemon_name)),
    ];

    setStats({
      totalReviews: reviewsData?.length || 0,
      reviewedPokemon: uniqueUserPokemon.length || 0,
    });

    setUserPokemonList(uniqueUserPokemon);
  }, [user]);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
        });
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  const handleSearch = async () => {
    if (!search.trim()) {
      alert("Enter Pokémon name!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${search.toLowerCase()}`
      );
      if (!res.ok) throw new Error("Pokémon not found!");
      const data: PokemonData = await res.json();
      setPokemon(data);
      await fetchReviews(data.name);
    } catch {
      alert("Pokémon not found!");
      setPokemon(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
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
        user_id: user?.id,
        content: newReview.trim(),
      },
    ]);

    if (error) {
      console.error("Insert failed:", error.message);
      alert("❌ Insert failed: " + error.message);
    } else {
      alert("✅ Review added successfully!");
      setNewReview("");
      await fetchReviews(pokemon.name);
      fetchStats();
    }
  };

  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("pokemon_reviews").delete().eq("id", id);
    if (!error) {
      await fetchReviews(pokemon?.name || "");
      fetchStats();
    }
  };

  const handleUpdateReview = async (id: string, content: string) => {
    const updated = prompt("Edit your review:", content);
    if (!updated || updated === content) return;
    const { error } = await supabase
      .from("pokemon_reviews")
      .update({ content: updated })
      .eq("id", id);
    if (!error && pokemon) await fetchReviews(pokemon.name);
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOption === "name_asc") return a.content.localeCompare(b.content);
    if (sortOption === "name_desc") return b.content.localeCompare(a.content);
    if (sortOption === "date_asc")
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      normal: "#A8A878",
      fire: "#F08030",
      water: "#6890F0",
      electric: "#F8D030",
      grass: "#78C850",
      ice: "#98D8D8",
      fighting: "#C03028",
      poison: "#A040A0",
      ground: "#E0C068",
      flying: "#A890F0",
      psychic: "#F85888",
      bug: "#A8B820",
      rock: "#B8A038",
      ghost: "#705898",
      dragon: "#7038F8",
      dark: "#705848",
      steel: "#B8B8D0",
      fairy: "#EE99AC",
    };
    return typeColors[type] || "#68A090";
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <h2>Searching for Pokémon...</h2>
          <p>Looking through the tall grass...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} style={{ maxWidth: "800px" }}>
        {/* Header Section */}
        <div className={styles.welcomeSection}>
<div className={styles.icon}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 511.985 511.985"
    width="32"
    height="32"
  >
    <path
      style={{ fill: "#ff0019" }}
      d="M491.859,156.348c-12.891-30.483-31.342-57.865-54.842-81.372 c-23.516-23.5-50.904-41.96-81.373-54.85c-31.56-13.351-65.091-20.125-99.652-20.125c-34.554,0-68.083,6.773-99.645,20.125 c-30.483,12.89-57.865,31.351-81.373,54.85c-23.499,23.507-41.959,50.889-54.85,81.372C6.774,187.91,0,221.44,0,255.993 c0,34.56,6.773,68.091,20.125,99.652c12.89,30.469,31.351,57.857,54.85,81.357c23.507,23.516,50.889,41.967,81.373,54.857 c31.562,13.344,65.091,20.125,99.645,20.125c34.561,0,68.092-6.781,99.652-20.125c30.469-12.891,57.857-31.342,81.373-54.857 c23.5-23.5,41.951-50.889,54.842-81.357c13.344-31.561,20.125-65.092,20.125-99.652C511.984,221.44,505.203,187.91,491.859,156.348z"
    />
    <path
      style={{ fill: "#E6E9ED" }}
      d="M0.102,263.18c0.875,32.014,7.593,63.092,20.023,92.465c12.89,30.469,31.351,57.857,54.85,81.357 c23.507,23.516,50.889,41.967,81.373,54.857c31.562,13.344,65.091,20.125,99.645,20.125c34.561,0,68.092-6.781,99.652-20.125 c30.469-12.891,57.857-31.342,81.373-54.857c23.5-23.5,41.951-50.889,54.842-81.357c12.438-29.373,19.156-60.451,20.031-92.465 H0.102z"
    />
    <path
      style={{ fill: "#434A54" }}
      d="M510.765,281.211c0.812-8.344,1.219-16.75,1.219-25.218c0-9.516-0.516-18.953-1.531-28.289 c-12.719,1.961-30.984,4.516-53.998,7.054c-43.688,4.82-113.904,10.57-200.463,10.57c-86.552,0-156.776-5.75-200.455-10.57 c-23.022-2.539-41.28-5.093-53.998-7.054C0.516,237.04,0,246.478,0,255.993c0,8.468,0.406,16.875,1.219,25.218 c41.53,6.25,133.027,17.436,254.773,17.436S469.234,287.461,510.765,281.211z"
    />
    <path
      style={{ fill: "#E6E9ED" }}
      d="M309.334,266.656c0,29.459-23.891,53.334-53.342,53.334c-29.452,0-53.334-23.875-53.334-53.334 c0-29.453,23.882-53.327,53.334-53.327C285.443,213.33,309.334,237.204,309.334,266.656z"
    />
    <path
      style={{ fill: "#434A54" }}
      d="M255.992,170.66c-52.936,0-95.997,43.069-95.997,95.997s43.062,95.988,95.997,95.988 s95.996-43.061,95.996-95.988C351.988,213.729,308.928,170.66,255.992,170.66z M255.992,309.335 c-23.522,0-42.663-19.156-42.663-42.678c0-23.523,19.14-42.663,42.663-42.663c23.531,0,42.654,19.14,42.654,42.663 C298.646,290.178,279.523,309.335,255.992,309.335z"
    />
  </svg>
</div>




          <h1 className={styles.title}>Pokémon Review</h1>
          <p className={styles.welcomeText}>Explore Pokémon database</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        {/* Stats */}
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

        {/* Search Section */}
        <div className={styles.section}>
          <div className={styles.searchSortContainer}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search Pokémon by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className={styles.searchButton}>
              Search
            </button>
          </div>

          {/* Dropdown for Reviewed Pokémon */}
          {userPokemonList.length > 0 && (
            <div className={styles.dropdownContainer}>
              <label htmlFor="reviewedPokemon" className={styles.dropdownLabel}>
                Or select from your reviewed Pokémon:
              </label>
              <select
                id="reviewedPokemon"
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected) {
                    setSearch(selected);
                    handleSearch();
                  }
                }}
                className={styles.dropdownSelect}
                value=""
              >
                <option value="" disabled>
                  Choose Pokémon
                </option>
                {userPokemonList.map((name) => (
                  <option key={name} value={name}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pokémon Display */}
        {pokemon && (
          <div className={styles.section}>
            <div className={styles.pokemonCard}>
              <div className={styles.pokemonHeader}>
                <div className={styles.pokemonInfo}>
                  <h2 className={styles.pokemonName}>
                    #{pokemon.id}{" "}
                    {pokemon.name.charAt(0).toUpperCase() +
                      pokemon.name.slice(1)}
                  </h2>
                  <div className={styles.pokemonTypes}>
                    {pokemon.types.map((typeInfo, index) => (
                      <span
                        key={index}
                        className={styles.pokemonType}
                        style={{
                          backgroundColor: getTypeColor(typeInfo.type.name),
                        }}
                      >
                        {typeInfo.type.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.pokemonImage}>
                  <Image
                    src={
                      pokemon.sprites.other?.["official-artwork"]
                        ?.front_default ||
                      pokemon.sprites.front_default ||
                      "/placeholder.png"
                    }
                    alt={pokemon.name}
                    width={150}
                    height={150}
                    className={styles.pokemonImg}
                  />
                </div>
              </div>

              <div className={styles.pokemonDetails}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Height</span>
                    <span className={styles.detailValue}>
                      {(pokemon.height / 10).toFixed(1)} m
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Weight</span>
                    <span className={styles.detailValue}>
                      {(pokemon.weight / 10).toFixed(1)} kg
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Base Exp</span>
                    <span className={styles.detailValue}>
                      {pokemon.base_experience}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {pokemon && (
          <div className={styles.section}>
            <div className={styles.reviewsContainer}>
              <div className={styles.reviewsHeader}>
                <h3 className={styles.sectionTitle}>
                  Reviews for{" "}
                  {pokemon.name.charAt(0).toUpperCase() +
                    pokemon.name.slice(1)}
                </h3>
                <div className={styles.reviewControls}>
                  <select
                    onChange={(e) => setSortOption(e.target.value)}
                    value={sortOption}
                    className={styles.sortSelect}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="name_asc">A-Z</option>
                    <option value="name_desc">Z-A</option>
                  </select>
                </div>
              </div>

              {/* Add Review */}
              <div className={styles.addReviewSection}>
                <textarea
                  placeholder="Share your thoughts about this Pokémon..."
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  className={styles.textarea}
                  rows={3}
                />
                <button
                  onClick={handleAddReview}
                  className={styles.saveButton}
                  disabled={!newReview.trim()}
                >
                  ➕ Add Review
                </button>
              </div>

              {/* Reviews List */}
              <div className={styles.reviewsList}>
                {sortedReviews.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No reviews yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  sortedReviews.map((review) => (
                    <div key={review.id} className={styles.reviewCard}>
                      <div className={styles.reviewContent}>
                        {review.content}
                      </div>
                      <div className={styles.reviewFooter}>
                        <div className={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleString()}
                        </div>
                        {review.user_id === user?.id && (
                          <div className={styles.reviewActions}>
                            <button
                              onClick={() =>
                                handleUpdateReview(review.id, review.content)
                              }
                              className={styles.reviewAction}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className={`${styles.reviewAction} ${styles.deleteAction}`}
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
        )}

        {/* Back Button */}
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
