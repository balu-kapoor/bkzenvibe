import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className='flex justify-center items-center min-h-screen bg-gray-100'>
      <div className='bg-white p-8 rounded-lg shadow-md'>
        <h1 className='text-2xl font-bold mb-4'>Welcome to My App</h1>
        <p className='mb-4'>Count: {count}</p>
        <button
          onClick={() => setCount(count + 1)}
          className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
        >
          Increment
        </button>
      </div>
    </div>
  );
}
