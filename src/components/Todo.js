import React from "react";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

function Todo({ todo, toggleComplete, deleteTodo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className='group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-3 transition-all hover:shadow-md'
    >
      <div className='flex items-center gap-3'>
        <button
          onClick={() => toggleComplete(todo.id)}
          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 ${
            todo.completed
              ? "border-green-500 bg-green-500 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400"
          } transition-colors`}
        >
          {todo.completed && <CheckCircleIcon className='w-5 h-5' />}
        </button>
        <span
          className={`text-base ${
            todo.completed
              ? "text-gray-400 dark:text-gray-500 line-through"
              : "text-gray-700 dark:text-gray-200"
          }`}
        >
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => deleteTodo(todo.id)}
        className='opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all'
      >
        <TrashIcon className='w-5 h-5' />
      </button>
    </motion.div>
  );
}

export default Todo;
