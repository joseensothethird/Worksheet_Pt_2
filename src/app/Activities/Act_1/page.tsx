"use client";

import { useEffect, useState } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import styles from "./../../../CSS/activities.module.css";

interface Todo {
  id: number;
  task: string;
  is_complete: boolean;
  user_id: string;
}

export default function Act1Page() {
  const [user, setUser] = useState<any>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch user and todos
  useEffect(() => {
    const fetchUserAndTodos = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/"; // redirect to index if not logged in
        return;
      }

      setUser(userData.user);
      await fetchTodos(userData.user.id);
      setLoading(false);
    };

    fetchUserAndTodos();
  }, []);

  const fetchTodos = async (userId: string) => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: true });

    if (error) console.error("Error fetching todos:", error);
    else setTodos(data || []);
  };

  const addTodo = async () => {
    if (!newTask.trim() || !user) return;
    const { data, error } = await supabase
      .from("todos")
      .insert([{ task: newTask, is_complete: false, user_id: user.id }])
      .select();

    if (error) {
      console.error("Error adding todo:", error);
      return;
    }

    setTodos((prev) => [...prev, ...(data || [])]);
    setNewTask("");
  };

  const toggleComplete = async (id: number, is_complete: boolean) => {
    const { error } = await supabase
      .from("todos")
      .update({ is_complete: !is_complete })
      .eq("id", id);

    if (error) {
      console.error("Error updating todo:", error);
      return;
    }

    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, is_complete: !is_complete } : todo
      )
    );
  };

  const deleteTodo = async (id: number) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting todo:", error);
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <h2>Loading...</h2>
          <p>Please wait while we load your to-do list</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header Section */}
        <div className={styles.welcomeSection}>
          <div className={styles.icon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M12 3C13.1819 3 14.3522 3.23279 15.4442 3.68508C16.5361 4.13738 17.5282 4.80031 18.364 5.63604C19.1997 6.47177 19.8626 7.46392 20.3149 8.55585C20.7672 9.64778 21 10.8181 21 12C21 13.1819 20.7672 14.3522 20.3149 15.4442C19.8626 16.5361 19.1997 17.5282 18.364 18.364C17.5282 19.1997 16.5361 19.8626 15.4442 20.3149C14.3522 20.7672 13.1819 21 12 21C10.8181 21 9.64778 20.7672 8.55585 20.3149C7.46392 19.8626 6.47177 19.1997 5.63604 18.364C4.80031 17.5282 4.13738 16.5361 3.68508 15.4442C3.23279 14.3522 3 13.1819 3 12C3 9.61305 3.94821 7.32387 5.63604 5.63604C7.32387 3.94821 9.61305 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>To-Do List</h1>
          <p className={styles.welcomeText}>Manage your tasks efficiently</p>
          <div className={styles.email}>{user?.email}</div>
        </div>

        {/* Add Todo Form */}
        <div className={styles.section}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
            <input
              type="text"
              value={newTask}
              placeholder="Enter a new task..."
              onChange={(e) => setNewTask(e.target.value)}
              className={styles.textarea}
              style={{ 
                minHeight: "auto", 
                padding: "16px",
                margin: 0,
                flex: 1
              }}
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
            />
            <button
              onClick={addTodo}
              className={styles.saveButton}
              style={{ 
                width: "auto", 
                minWidth: "100px",
                margin: 0
              }}
              disabled={!newTask.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add
            </button>
          </div>

          {/* Todo List */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Your Tasks</h3>
            {todos.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No tasks yet. Add your first task above!</p>
              </div>
            ) : (
              <div className={styles.friendsGrid}>
                {todos.map((todo) => (
                  <div key={todo.id} className={styles.friendCard}>
                    <div 
                      className={styles.friendIcon}
                      onClick={() => toggleComplete(todo.id, todo.is_complete)}
                      style={{ 
                        cursor: "pointer",
                        background: todo.is_complete 
                          ? "linear-gradient(135deg, #38b2ac, #319795)" 
                          : "linear-gradient(135deg, #667eea, #764ba2)"
                      }}
                    >
                      {todo.is_complete ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12H12.01M12 6V6.01M12 18V18.01M18 12H18.01M6 12H6.01M18.364 5.636L18.364 5.636M18.364 18.364L18.364 18.364M5.636 18.364L5.636 18.364M5.636 5.636L5.636 5.636" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className={styles.friendInfo}>
                      <span 
                        className={styles.friendName}
                        style={{ 
                          textDecoration: todo.is_complete ? "line-through" : "none",
                          color: todo.is_complete ? "#718096" : "#1a202c",
                          cursor: "pointer"
                        }}
                        onClick={() => toggleComplete(todo.id, todo.is_complete)}
                      >
                        {todo.task}
                      </span>
                      <div className={styles.friendStatus}>
                        {todo.is_complete ? "Completed" : "Pending"}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className={styles.deleteButton}
                      style={{ 
                        width: "auto", 
                        padding: "8px 16px",
                        fontSize: "14px"
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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