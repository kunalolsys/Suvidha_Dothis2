import React from 'react';
import { Frown, Home } from 'lucide-react';

const PageNotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col items-center p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <Frown size={64} className="text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          404 Page Not Found
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
          Oops! The page you are looking for seems to be lost.
        </p>
        <a
          href="/"
          className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-md"
        >
          <Home size={16} className="mr-2" />
          Go Back Home
        </a>
      </div>
    </div>
  );
};

export default PageNotFound;