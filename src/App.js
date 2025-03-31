import React from "react";
import TodoList from "./components/TodoList";

function App() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      <TodoList />
    </div>
  );
}

export default App;
