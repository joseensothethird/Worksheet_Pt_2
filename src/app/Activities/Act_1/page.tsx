"use client";

export const dynamic = "force-dynamic"; // ✅ prevents build crash

import { useEffect, useState } from "react";
import { supabase } from "./../../../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import styles from "./../../../CSS/todo-list.module.css";

interface Todo {
  id: number;
  task: string;
  is_complete: boolean;
  user_id: string;
}

export default function Act1Page() {
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserAndTodos = async () => {
      const { data: userData, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error.message);
        return;
      }

      if (!userData?.user) {
        window.location.href = "/";
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

    if (error) console.error("Error fetching todos:", error.message);
    else setTodos(data || []);
  };

  const addTodo = async () => {
    if (!newTask.trim() || !user) return;

    const { data, error } = await supabase
      .from("todos")
      .insert([{ task: newTask, is_complete: false, user_id: user.id }])
      .select();

    if (error) {
      console.error("Error adding todo:", error.message);
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
      console.error("Error updating todo:", error.message);
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
      console.error("Error deleting todo:", error.message);
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

// Update your component's JSX to use the new CSS classes:

return (
  <div className={styles.container}>
    <div className={styles.content}>
      <div className={styles.welcomeSection}>
        <h1 className={styles.title}>To-Do List</h1>
        <p className={styles.welcomeText}>Manage your tasks efficiently</p>
        <div className={styles.email}>{user?.email}</div>
      </div>

      <div className={styles.section}>
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={newTask}
            placeholder="Enter a new task..."
            onChange={(e) => setNewTask(e.target.value)}
            className={styles.textarea}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
          />
          <button
            onClick={addTodo}
            className={styles.saveButton}
            disabled={!newTask.trim()}
          >
            Add
          </button>
        </div>

        {/* Todo Stats */}
        <div className={styles.todoStats}>
          <span className={styles.stat}>
            Total: {todos.length}
          </span>
          <span className={`${styles.stat} ${styles.completed}`}>
            Completed: {todos.filter(todo => todo.is_complete).length}
          </span>
          <span className={`${styles.stat} ${styles.pending}`}>
            Pending: {todos.filter(todo => !todo.is_complete).length}
          </span>
        </div>

        {todos.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          <div className={styles.todoList}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`${styles.todoItem} ${todo.is_complete ? styles.completed : ''}`}
                onClick={() => toggleComplete(todo.id, todo.is_complete)}
              >
                <div className={styles.todoContent}>
                  <div className={styles.todoCheckbox} />
                  <span className={styles.todoText}>{todo.task}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTodo(todo.id);
                  }}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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