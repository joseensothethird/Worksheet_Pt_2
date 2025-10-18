"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import styles from "../../../CSS/pokemon.module.css";
import type { User } from "@supabase/supabase-js";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function MarkdownNotesApp() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");

  // 🔐 Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        router.push("/auth/login");
        return;
      }

      setUser(data.user);
      await fetchNotes(data.user.id);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // 📥 Fetch user notes
  const fetchNotes = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("markdown_notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  // 💾 Add or Update note
  const handleAddOrUpdate = async () => {
    if (!user) return;
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("markdown_notes")
        .update({ title, content })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        alert("Update failed!");
        return;
      }
    } else {
      const { error } = await supabase.from("markdown_notes").insert([
        {
          title: title.trim(),
          content: content.trim(),
          user_id: user.id,
        },
      ]);

      if (error) {
        console.error(error);
        alert("Insert failed!");
        return;
      }
    }

    setTitle("");
    setContent("");
    setEditingId(null);
    await fetchNotes(user.id);
  };

  // 🗑️ Delete note
  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this note?")) return;

    const { error } = await supabase.from("markdown_notes").delete().eq("id", id);
    if (error) console.error("Delete failed:", error);

    await fetchNotes(user.id);
  };

  // ✏️ Edit note
  const handleEdit = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.id);
    setIsPreview(false);
  };

  // 🔀 Sorting logic
  const sortedNotes = [...notes].sort((a, b) => {
    if (sortOption === "az") return a.title.localeCompare(b.title);
    if (sortOption === "za") return b.title.localeCompare(a.title);
    if (sortOption === "oldest")
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.welcomeSection}>
          <div className={styles.icon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <path d="M11 11l2 2" />
            </svg>
          </div>
          <h1 className={styles.title}>Markdown Notes</h1>
          <p className={styles.welcomeText}>Write and preview Markdown content</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        {/* Note Input Section */}
        <div className={styles.section}>
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.textarea}
            style={{ marginBottom: "16px", height: "auto", minHeight: "auto" }}
          />

          <div className={styles.buttonGrid} style={{ marginBottom: "16px" }}>
            <button onClick={() => setIsPreview(!isPreview)} className={styles.dashboardButton}>
              {isPreview ? "Switch to Edit Mode" : "Switch to Preview"}
            </button>
            <button onClick={handleAddOrUpdate} className={styles.saveButton}>
              {editingId ? "Update Note" : "Add Note"}
            </button>
          </div>

          <div className={styles.textareaContainer}>
            {isPreview ? (
              <div
                className={styles.textarea}
                style={{ minHeight: "200px", background: "#f8fafc" }}
              >
                <ReactMarkdown>{content || "_Nothing to preview..._"}</ReactMarkdown>
              </div>
            ) : (
              <textarea
                placeholder="Write Markdown content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={styles.textarea}
                style={{ minHeight: "200px" }}
              />
            )}
          </div>
        </div>

        {/* Sorting Section */}
        <div className={styles.section}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <label style={{ fontSize: "14px", color: "#4a5568", fontWeight: "500" }}>
              Sort by:
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className={styles.sortSelect}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "2px solid #e2e8f0",
              }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">Title A-Z</option>
              <option value="za">Title Z-A</option>
            </select>
          </div>

          {/* Notes Display */}
          <div className={styles.notesGrid}>
            {sortedNotes.length === 0 ? (
              <div className={styles.emptyState}>No notes yet. Create your first note above!</div>
            ) : (
              sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className={styles.noteCard}
                  style={{
                    background: "#f7fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "16px",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px 0", color: "#1a202c" }}>{note.title}</h3>
                  <small style={{ color: "#718096" }}>
                    {new Date(note.created_at).toLocaleString()}
                  </small>
                  <div style={{ marginTop: "12px", color: "#4a5568" }}>
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                  <div
                    className={styles.actionButtons}
                    style={{
                      marginTop: "16px",
                      flexDirection: "row",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={() => handleEdit(note)}
                      className={styles.dashboardButton}
                      style={{ flex: 1, padding: "12px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className={styles.deleteButton}
                      style={{ flex: 1, padding: "12px" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className={styles.actionButtons}>
          <button className={styles.backButton} onClick={() => router.push("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
