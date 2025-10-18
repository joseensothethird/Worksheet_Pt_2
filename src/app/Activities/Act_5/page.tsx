"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import ReactMarkdown from "react-markdown";
import styles from "@/app/CSS/Home.module.css";

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function MarkdownNotesApp() {
  const [user, setUser] = useState<any>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUser(data.user);
      await fetchNotes(data.user.id);
    };
    getUser();
  }, []);

  const fetchNotes = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("markdown_notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setNotes(data);
    setLoading(false);
  };

  const handleAddOrUpdate = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("markdown_notes")
        .update({ title, content })
        .eq("id", editingId);
      if (error) return alert("Update failed.");
    } else {
      const { error } = await supabase.from("markdown_notes").insert([
        {
          title: title.trim(),
          content: content.trim(),
          user_id: user.id,
        },
      ]);
      if (error) return alert("Insert failed.");
    }

    setTitle("");
    setContent("");
    setEditingId(null);
    await fetchNotes(user.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("markdown_notes").delete().eq("id", id);
    await fetchNotes(user.id);
  };

  const handleEdit = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.id);
    setIsPreview(false);
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortOption === "az") return a.title.localeCompare(b.title);
    if (sortOption === "za") return b.title.localeCompare(a.title);
    if (sortOption === "oldest")
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className={styles.container} style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h1>📝 Markdown Notes App</h1>
      <p>Write, preview, and manage your Markdown notes.</p>

      {!user ? (
        <p>Please log in to access your notes.</p>
      ) : (
        <>
          <div style={{ marginTop: "1rem" }}>
            <input
              type="text"
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <button onClick={() => setIsPreview(!isPreview)}>
                {isPreview ? "Switch to Edit Mode" : "Switch to Preview"}
              </button>
              <button onClick={handleAddOrUpdate}>
                {editingId ? "Update Note" : "Add Note"}
              </button>
            </div>

            <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "6px" }}>
              {isPreview ? (
                <ReactMarkdown>{content || "_Nothing to preview..._"}</ReactMarkdown>
              ) : (
                <textarea
                  placeholder="Write Markdown content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ width: "100%", height: "200px" }}
                />
              )}
            </div>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <div style={{ marginBottom: "10px" }}>
              <label>Sort by: </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                style={{ marginLeft: "10px" }}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="az">Title A-Z</option>
                <option value="za">Title Z-A</option>
              </select>
            </div>

            {loading ? (
              <p>Loading notes...</p>
            ) : sortedNotes.length === 0 ? (
              <p>No notes found.</p>
            ) : (
              sortedNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "10px",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <h3>{note.title}</h3>
                  <small>{new Date(note.created_at).toLocaleString()}</small>
                  <div style={{ marginTop: "10px" }}>
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                  <div style={{ marginTop: "10px" }}>
                    <button onClick={() => handleEdit(note)}>Edit</button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      style={{ marginLeft: "10px", color: "red" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
