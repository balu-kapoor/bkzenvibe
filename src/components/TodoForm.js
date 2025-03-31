import React, { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

function TodoForm({ addTodo }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() !== "") {
      addTodo(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className='w-full max-w-3xl mx-auto mb-8'>
      <div className='flex gap-2'>
        <input
          type='text'
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Add a task...'
          className='flex-1 min-w-0 px-4 py-3 text-base rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all'
        />
        <button
          type='submit'
          className='inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors'
        >
          <PlusIcon className='w-5 h-5 mr-1' />
          Add Task
        </button>
      </div>
    </form>
  );
}

export default TodoForm;
