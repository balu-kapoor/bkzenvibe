import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import TodoForm from "./TodoForm";
import Todo from "./Todo";

function TodoList() {
  const [todos, setTodos] = useState(() => {
    const savedTodos = localStorage.getItem("todos");
    return savedTodos ? JSON.parse(savedTodos) : [];
  });

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = (text) => {
    const newTodo = {
      id: Math.random().toString(36).substring(2),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos([newTodo, ...todos]);
  };

  const toggleComplete = (id) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4'>
      <div className='max-w-3xl mx-auto'>
        <header className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-4'>
            Todo List
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>
            Stay organized and productive
          </p>
        </header>

        <TodoForm addTodo={addTodo} />

        <div className='space-y-8'>
          {activeTodos.length > 0 && (
            <section>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Active Tasks ({activeTodos.length})
              </h2>
              <AnimatePresence>
                {activeTodos.map((todo) => (
                  <Todo
                    key={todo.id}
                    todo={todo}
                    toggleComplete={toggleComplete}
                    deleteTodo={deleteTodo}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {completedTodos.length > 0 && (
            <section>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Completed ({completedTodos.length})
              </h2>
              <AnimatePresence>
                {completedTodos.map((todo) => (
                  <Todo
                    key={todo.id}
                    todo={todo}
                    toggleComplete={toggleComplete}
                    deleteTodo={deleteTodo}
                  />
                ))}
              </AnimatePresence>
            </section>
          )}

          {todos.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-gray-500 dark:text-gray-400'>
                No tasks yet. Add one above!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodoList;
