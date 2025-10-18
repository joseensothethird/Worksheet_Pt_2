"use client";

import { useState, useEffect } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import styles from "./../../../CSS/pokemon.module.css";
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
  const [stats, setStats] = useState({ totalReviews: 0, reviewedPokemon: 0 });

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      fetchStats();
    };
    getUser();
  }, []);

  const fetchStats = async () => {
    const { data: reviewsData } = await supabase
      .from("pokemon_reviews")
      .select("pokemon_name");
    
    const { data: pokemonData } = await supabase
      .from("pokemon_reviews")
      .select("pokemon_name")
      .eq("user_id", user?.id);

    setStats({
      totalReviews: reviewsData?.length || 0,
      reviewedPokemon: new Set(pokemonData?.map(p => p.pokemon_name)).size || 0
    });
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      alert("Enter Pokémon name!");
      return;
    }
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
      fetchStats();
    }
  };

  const handleDeleteReview = async (id: string) => {
    const { error } = await supabase.from("pokemon_reviews").delete().eq("id", id);
    if (error) console.error(error);
    else {
      await fetchReviews(pokemon.name);
      fetchStats();
    }
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

  const getTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return typeColors[type] || '#68A090';
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
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>Pokémon Review</h1>
          <p className={styles.welcomeText}>Explore Pokémon database</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        {/* Stats Section */}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search Pokémon by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button 
              onClick={handleSearch}
              className={styles.saveButton}
              style={{ width: 'auto', minWidth: '120px', margin: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Search
            </button>
          </div>
        </div>

        {/* Pokémon Display */}
        {pokemon && (
          <div className={styles.section}>
            <div className={styles.pokemonCard}>
              <div className={styles.pokemonHeader}>
                <div className={styles.pokemonInfo}>
                  <h2 className={styles.pokemonName}>
                    #{pokemon.id} {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                  </h2>
                  <div className={styles.pokemonTypes}>
                    {pokemon.types.map((typeInfo: any, index: number) => (
                      <span 
                        key={index}
                        className={styles.pokemonType}
                        style={{ backgroundColor: getTypeColor(typeInfo.type.name) }}
                      >
                        {typeInfo.type.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.pokemonImage}>
                  <img
                    src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
                    alt={pokemon.name}
                    className={styles.pokemonImg}
                  />
                </div>
              </div>
              
              <div className={styles.pokemonDetails}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Height</span>
                    <span className={styles.detailValue}>{(pokemon.height / 10).toFixed(1)} m</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Weight</span>
                    <span className={styles.detailValue}>{(pokemon.weight / 10).toFixed(1)} kg</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Base Exp</span>
                    <span className={styles.detailValue}>{pokemon.base_experience}</span>
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
                  Reviews for {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
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

              {/* Add Review Form */}
              <div className={styles.addReviewSection}>
                <div className={styles.textareaContainer}>
                  <textarea
                    placeholder="Share your thoughts about this Pokémon..."
                    value={newReview}
                    onChange={(e) => setNewReview(e.target.value)}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>
                <button 
                  onClick={handleAddReview}
                  className={styles.saveButton}
                  disabled={!newReview.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add Review
                </button>
              </div>

              {/* Reviews List */}
              <div className={styles.reviewsList}>
                {sortedReviews.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 11.5C21 16.194 16.194 21 11.5 21C6.806 21 2 16.194 2 11.5C2 6.806 6.806 2 11.5 2C16.194 2 21 6.806 21 11.5Z" stroke="#9ca3af" strokeWidth="2"/>
                      <path d="M15 11.5L10.5 9V14L15 11.5Z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
                              onClick={() => handleUpdateReview(review.id, review.content)}
                              className={styles.reviewAction}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteReview(review.id)}
                              className={`${styles.reviewAction} ${styles.deleteAction}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              Delete
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