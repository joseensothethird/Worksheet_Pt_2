"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import styles from "./../CSS/Home.module.css";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace("/auth");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    alert("❌ Account deletion must be done via a server function (Supabase admin API).");
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <h2>Loading...</h2>
          <p>Please wait while we load your dashboard</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Welcome Section */}
        <div className={styles.welcomeSection}>
          <h1 className={styles.title}>Welcome back!</h1>
          <p className={styles.welcomeText}>Good to see you again</p>
          <div className={styles.email}>{user.email}</div>
        </div>

        {/* Activities Grid */}
        <div className={styles.buttonGrid}>
          <button
            className={`${styles.dashboardButton} ${styles.profile}`}
            onClick={() => router.push("/Activities/Act_1")}
          >
            ✅ To-do List
          </button>

          <button
            className={`${styles.dashboardButton} ${styles.secrets}`}
            onClick={() => router.push("/Activities/Act_2")}
          >
            📁 Google Drive Lite
          </button>

          <button
            className={`${styles.dashboardButton} ${styles.friends}`}
            onClick={() => router.push("/Activities/Act_3")}
          >
            🍽️ Food Review App
          </button>

          <button
            className={styles.dashboardButton}
            onClick={() => router.push("/Activities/Act_4")}
          >
            🐱 Pokémon Review
          </button>

          <button
            className={styles.dashboardButton}
            onClick={() => router.push("/Activities/Act_5")}
          >
            📝 Markdown Notes
          </button>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            🚪 Sign Out
          </button>

          <button className={styles.deleteButton} onClick={handleDeleteAccount}>
            🗑️ Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
