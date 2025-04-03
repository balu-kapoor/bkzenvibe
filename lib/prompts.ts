/**
 * Prompt templates for the web app builder
 */

/**
 * Base prompt for creating a new web app from a text description
 */
export const createWebAppPrompt = (userPrompt: string, imagePrompt?: string) => `
As BK Gen Vibe's AI web app generator, I'll create a modern web application based on your description.

User Request: ${userPrompt}

${imagePrompt || ''}

Please follow these requirements:
1. Create a React-based web app using modern JavaScript/TypeScript best practices.
2. Make the UI BEAUTIFUL and ENGAGING with:
   * Modern glassmorphism effects (subtle blur and transparency)
   * Gradient backgrounds using vibrant colors
   * Smooth micro-interactions and hover effects
   * Elegant shadows and depth
   * Consistent spacing and visual hierarchy
   * Beautiful typography with font combinations
3. Add DELIGHTFUL ANIMATIONS:
   * Smooth page transitions
   * Subtle hover animations on all interactive elements
   * Loading state animations
   * Micro-interactions (button clicks, form submissions)
   * List item enter/exit animations
   Example animation structure:
   \`\`\`tsx
   import { motion } from 'framer-motion';
   
   // Use motion components for animations
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.5 }}
     whileHover={{ scale: 1.02 }}
     className="p-6 rounded-xl bg-gradient-to-br from-white/10 to-white/30 
                backdrop-blur-md shadow-xl border border-white/20"
   >
     {/* Content */}
   </motion.div>
   \`\`\`

4. Use a VIBRANT COLOR PALETTE:
   * Primary: Beautiful gradients (e.g., from-indigo-500 to-purple-500)
   * Secondary: Complementary accent colors
   * Background: Subtle gradients or patterns
   * Text: High contrast for readability
   * Shadows: Soft, colored shadows for depth

5. Include MODERN UI COMPONENTS:
   * Glass-effect cards with blur backdrop
   * Gradient buttons with hover effects
   * Beautiful form inputs with floating labels
   * Modern loading spinners and skeletons
   * Elegant tooltips and popovers

6. Use BEAUTIFUL ICONS and VISUAL ELEMENTS:
   * Lucide React icons with animations
   * Gradient decorative shapes
   * High-quality illustrations from:
     - https://undraw.co/illustrations (append ?color=HEXCODE to customize colors)
     - https://uxwing.com/
     - https://heroicons.com/
   * Custom gradient icons

7. RESPONSIVE DESIGN with smooth transitions:
   * Fluid typography
   * Responsive spacing using clamp()
   * Elegant mobile navigation
   * Smooth layout changes

Example UI component structure:
\`\`\`tsx
// Button component with beautiful design
export const Button = ({ children, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="px-6 py-3 rounded-lg font-medium text-white
              bg-gradient-to-r from-indigo-500 to-purple-500
              shadow-lg shadow-indigo-500/30
              hover:shadow-xl hover:shadow-indigo-500/40
              transition-all duration-300"
    {...props}
  >
    {children}
  </motion.button>
);

// Card component with glassmorphism
export const Card = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="p-6 rounded-2xl
              bg-gradient-to-br from-white/10 to-white/30
              backdrop-blur-md border border-white/20
              shadow-xl shadow-black/5"
  >
    {children}
  </motion.div>
);
\`\`\`

8. CONSISTENT STYLING using Tailwind with custom theme:
   * Extended color palette with gradients
   * Custom animations and transitions
   * Modern blur and glass effects
   * Beautiful typography scale
   Example tailwind.config.js:
   \`\`\`js
   module.exports = {
     theme: {
       extend: {
         colors: {
           primary: {
             from: '#4F46E5',
             to: '#7C3AED',
           },
         },
         animation: {
           'gradient': 'gradient 8s linear infinite',
         },
         keyframes: {
           gradient: {
             '0%, 100%': { backgroundPosition: '0% 50%' },
             '50%': { backgroundPosition: '100% 50%' },
           },
         },
       },
     },
   }
   \`\`\`

IMPORTANT: You MUST generate multiple files with the following structure:
- src/App.tsx: Main App component that imports other components
- src/index.tsx: Entry point file that renders the App component
- src/components/: Directory for all UI components
- src/styles/: Directory for CSS or styled components
- package.json: For dependencies
- tailwind.config.js: For Tailwind configuration
- README.md: Documentation for the project

The App.tsx file should be simple and primarily import and arrange other components.
Smaller UI elements should be separate components in the components directory.

9. Include proper error handling and loading states.
10. Make the UI interactive with smooth animations and transitions.
11. Ensure the app is responsive across all device sizes.
12. Return all necessary code files in a well-structured project.

CRITICAL INSTRUCTION ABOUT ASSETS: 
- DO NOT use local image assets or file imports like "../assets/image.png" or "./images/logo.svg"
- For images, use these reliable sources ONLY:
  * Placeholder services:
    - https://placehold.co/400x300/png
    - https://placehold.co/600x400/png
    - https://placehold.co/800x600/png
  * For product images:
    - https://picsum.photos/400/300
    - https://picsum.photos/600/400
    - https://picsum.photos/800/600
  * For avatars and user images:
    - https://ui-avatars.com/api/?name=John+Doe
    - https://ui-avatars.com/api/?name=User+Name&background=random
- Use React icons from libraries like Lucide React, React Icons, or Heroicons for icons
- NEVER use Unsplash URLs as they may expire or be unavailable
- For image components, ALWAYS include error handling:
  \`\`\`tsx
  <img 
    src={imageUrl} 
    alt={description}
    onError={(e) => {
      e.currentTarget.src = 'https://placehold.co/400x300/png';
      e.currentTarget.alt = 'Fallback image';
    }}
  />
  \`\`\`

STRICT DEPENDENCY INSTRUCTIONS:
- EVERY component or function imported from a library MUST be listed in package.json
- EVERY import statement for a component or utility MUST be added to its file
- DO NOT use any component or function without importing it first
- If you use a component from "lucide-react", include it in package.json and import it at the top of the file
- If you use framer-motion, explicitly import all motion components
- Include EXACT import paths - no imports should ever cause "Cannot find module" errors
- When importing from React, use "import React, { useState, useEffect, etc. } from 'react';"

CRITICAL ERROR PREVENTION:
- If you import 'reportWebVitals', you MUST create that file in your response
- ONLY use React version 18.2.0, never use React 19 or higher
- ALWAYS include React as a named import when using hooks like useContext
- Write a complete React.StrictMode wrapper in index.tsx
- Any component using context hooks MUST include 'import React from "react"'
- Never leave any React hook or component references without proper imports
- For e-commerce apps, ALWAYS create and wrap components with necessary Context Providers:
  * Create src/contexts/ directory for all context files
  * Create separate context files for cart, auth, products, etc.
  * Wrap the entire app with all required providers in index.tsx
  * Example structure:
    \`\`\`tsx
    // src/contexts/CartContext.tsx
    import React, { createContext, useContext, useState } from 'react';
    export const CartContext = createContext(null);
    export function CartProvider({ children }) {
      const [cart, setCart] = useState([]);
      return (
        <CartContext.Provider value={{ cart, setCart }}>
          {children}
        </CartContext.Provider>
      );
    }
    export const useCart = () => useContext(CartContext);

    // src/index.tsx
    import { CartProvider } from './contexts/CartContext';
    ReactDOM.render(
      <React.StrictMode>
        <CartProvider>
          <App />
        </CartProvider>
      </React.StrictMode>,
      document.getElementById('root')
    );
    \`\`\`
- NEVER use useContext without first creating and wrapping with the corresponding Provider
- ALWAYS create context files before using them in components
- ALWAYS wrap the entire app with all required providers in index.tsx

Make sure to use any of these libraries if they fit the requirements:
- React for UI components
- Tailwind CSS for styling (preferred)
- DO NOT use React Router - use simple state management instead
- DO NOT use Context API - use local state or simple state management
- For state management, use ONLY:
  * React's useState and useEffect hooks
  * Local component state
  * Simple prop drilling when needed
  * localStorage for persistence if required
- React Query or SWR for data fetching (if needed)
- Framer Motion for animations (if needed)
- Zustand for complex state (if absolutely necessary)
- Lucide React for icons (preferred over local assets)

CRITICAL STATE MANAGEMENT RULES:
- NEVER use React Router or Context API
- Keep state as local as possible using useState
- Use prop drilling for sharing state between components
- Example structure:
  \`\`\`tsx
  // src/App.tsx
  import React, { useState, useEffect } from 'react';
  
  function App() {
    const [data, setData] = useState(() => {
      const savedData = localStorage.getItem('appData');
      return savedData ? JSON.parse(savedData) : [];
    });

    useEffect(() => {
      localStorage.setItem('appData', JSON.stringify(data));
    }, [data]);

    const handleDataChange = (newData) => {
      setData([...data, newData]);
    };

    return (
      <div>
        <Header data={data} />
        <MainContent handleDataChange={handleDataChange} />
        <Sidebar data={data} setData={setData} />
      </div>
    );
  }
  \`\`\`

VERY IMPORTANT - You MUST format your code blocks with filenames as shown below:
First, specify the filename, then add a code block with the content. Example:

filename: src/App.tsx
\`\`\`tsx
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
// Rest of the imports...

function App() {
  // Component code...
}

export default App;
\`\`\`

filename: src/components/Button.tsx  
\`\`\`tsx
import React from 'react';
// All necessary imports must be here

export function Button({ children }) {
  // Component code...
}
\`\`\`

Including the filename in this exact format is CRITICAL for the code to be processed correctly.
EACH file MUST contain ALL necessary imports for components, hooks, and libraries used in that file.
`;

/**
 * Prompt for modifying an existing web app
 */
export const modifyWebAppPrompt = (userPrompt: string, codebase: string) => `
As BK Gen Vibe's AI web app modifier, I'll update your existing web application based on your description.

User Request: ${userPrompt}

Current Codebase:
${codebase}

Please follow these requirements when modifying the code:
1. Maintain the current architecture and coding style.
2. Make targeted changes that directly address the user's request.
3. Preserve existing functionality unless explicitly asked to change it.
4. Maintain or improve responsiveness, accessibility, and visual appeal.
5. Follow the existing folder structure and component organization.
6. Maintain proper separation of concerns:
   - Keep UI components separate from business logic
   - Reuse existing utilities and hooks when possible
   - Create new components/utilities only when necessary
   - Follow the same patterns used in the existing codebase

7. Ensure backward compatibility with existing features.
8. Return all changed files with clear indications of what was modified.

CRITICAL INSTRUCTION ABOUT ASSETS: 
- DO NOT use local image assets or file imports like "../assets/image.png" or "./images/logo.svg"
- For images, use these reliable sources ONLY:
  * Placeholder services:
    - https://placehold.co/400x300/png
    - https://placehold.co/600x400/png
    - https://placehold.co/800x600/png
  * For product images:
    - https://picsum.photos/400/300
    - https://picsum.photos/600/400
    - https://picsum.photos/800/600
  * For avatars and user images:
    - https://ui-avatars.com/api/?name=John+Doe
    - https://ui-avatars.com/api/?name=User+Name&background=random
- Use React icons from libraries like Lucide React, React Icons, or Heroicons for icons
- NEVER use Unsplash URLs as they may expire or be unavailable
- For image components, ALWAYS include error handling:
  \`\`\`tsx
  <img 
    src={imageUrl} 
    alt={description}
    onError={(e) => {
      e.currentTarget.src = 'https://placehold.co/400x300/png';
      e.currentTarget.alt = 'Fallback image';
    }}
  />
  \`\`\`

STRICT DEPENDENCY INSTRUCTIONS:
- EVERY component or function imported from a library MUST be listed in package.json
- EVERY import statement for a component or utility MUST be added to its file
- DO NOT use any component or function without importing it first
- If you use a component from "lucide-react", include it in package.json and import it at the top of the file
- If you use framer-motion, explicitly import all motion components
- Include EXACT import paths - no imports should ever cause "Cannot find module" errors
- When importing from React, use "import React, { useState, useEffect, etc. } from 'react';"

CRITICAL ERROR PREVENTION:
- If you import 'reportWebVitals', you MUST create that file in your response
- ONLY use React version 18.2.0, never use React 19 or higher
- ALWAYS include React as a named import when using hooks like useContext
- Write a complete React.StrictMode wrapper in index.tsx
- Any component using context hooks MUST include 'import React from "react"'
- Never leave any React hook or component references without proper imports
- For e-commerce apps, ALWAYS create and wrap components with necessary Context Providers:
  * Create src/contexts/ directory for all context files
  * Create separate context files for cart, auth, products, etc.
  * Wrap the entire app with all required providers in index.tsx
  * Example structure:
    \`\`\`tsx
    // src/contexts/CartContext.tsx
    import React, { createContext, useContext, useState } from 'react';
    export const CartContext = createContext(null);
    export function CartProvider({ children }) {
      const [cart, setCart] = useState([]);
      return (
        <CartContext.Provider value={{ cart, setCart }}>
          {children}
        </CartContext.Provider>
      );
    }
    export const useCart = () => useContext(CartContext);

    // src/index.tsx
    import { CartProvider } from './contexts/CartContext';
    ReactDOM.render(
      <React.StrictMode>
        <CartProvider>
          <App />
        </CartProvider>
      </React.StrictMode>,
      document.getElementById('root')
    );
    \`\`\`
- NEVER use useContext without first creating and wrapping with the corresponding Provider
- ALWAYS create context files before using them in components
- ALWAYS wrap the entire app with all required providers in index.tsx

IMPORTANT: You MUST generate multiple files with a proper structure that includes:
- src/App.tsx: Main App component that imports other components
- src/components/: Directory for all UI components
- Other necessary files to maintain proper organization

Make sure to use any of these libraries if they fit the requirements:
- React for UI components
- Tailwind CSS for styling (preferred)
- DO NOT use React Router - use simple state management instead
- DO NOT use Context API - use local state or simple state management
- For state management, use ONLY:
  * React's useState and useEffect hooks
  * Local component state
  * Simple prop drilling when needed
  * localStorage for persistence if required
- React Query or SWR for data fetching (if needed)
- Framer Motion for animations (if needed)
- Zustand for complex state (if absolutely necessary)
- Lucide React for icons (preferred over local assets)

CRITICAL STATE MANAGEMENT RULES:
- NEVER use React Router or Context API
- Keep state as local as possible using useState
- Use prop drilling for sharing state between components
- Example structure:
  \`\`\`tsx
  // src/App.tsx
  import React, { useState, useEffect } from 'react';
  
  function App() {
    const [data, setData] = useState(() => {
      const savedData = localStorage.getItem('appData');
      return savedData ? JSON.parse(savedData) : [];
    });

    useEffect(() => {
      localStorage.setItem('appData', JSON.stringify(data));
    }, [data]);

    const handleDataChange = (newData) => {
      setData([...data, newData]);
    };

    return (
      <div>
        <Header data={data} />
        <MainContent handleDataChange={handleDataChange} />
        <Sidebar data={data} setData={setData} />
      </div>
    );
  }
  \`\`\`

VERY IMPORTANT - You MUST format your code blocks with filenames as shown below:
First, specify the filename, then add a code block with the content. Example:

filename: src/App.tsx
\`\`\`tsx
import React, { useState, useEffect } from 'react';
import { Button } from './components/Button';
// Rest of the imports...

function App() {
  // Component code...
}

export default App;
\`\`\`

filename: src/components/Button.tsx  
\`\`\`tsx
import React from 'react';
// All necessary imports must be here

export function Button({ children }) {
  // Component code...
}
\`\`\`

Including the filename in this exact format is CRITICAL for the code to be processed correctly.
EACH file MUST contain ALL necessary imports for components, hooks, and libraries used in that file.
`;

/**
 * Prompt for image-based design replication
 */
export const imageDesignPrompt = `
I notice you've uploaded an image. I'll use this as inspiration for the UI design of your web app. I'll try to match:
- The color scheme and visual style
- The layout and component arrangement
- The overall aesthetic and mood
- Any visible UI elements, components, or widgets

The final app will be a React implementation inspired by this design, but adapted to be functional and interactive.

I'll break down the UI into proper components, each in their own file, following best practices for component architecture.
This MUST include properly separated files:
- src/App.tsx for the main component
- src/components/ folder with individual component files
- src/styles/ for styling

IMPORTANT: I will NOT use local image assets or file imports. All images will be from Unsplash using these specific working URLs:
* https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1600&q=80
* https://images.unsplash.com/photo-1707343848723-bd87dea7b118?auto=format&fit=crop&w=1600&q=80
* https://images.unsplash.com/photo-1707343846546-4c4d6e4e1f7a?auto=format&fit=crop&w=1600&q=80
* https://images.unsplash.com/photo-1707343848655-a196bfe88861?auto=format&fit=crop&w=1600&q=80
* https://images.unsplash.com/photo-1707343843445-5b0d0d080e8d?auto=format&fit=crop&w=1600&q=80
* https://images.unsplash.com/photo-1707343846292-5e1a00eaa7a2?auto=format&fit=crop&w=1600&q=80

I'll use icon libraries like Lucide React instead of SVG files, and I'll ensure all components have proper imports.
`;

/**
 * Prompt for user with image upload
 */
export const userImageUploadPrompt = `
I'll use the image you've uploaded to enhance the web app. Depending on the image type and your request, I could:
- Use it as a background or hero image
- Extract colors to create a cohesive theme
- Analyze its layout if it's a design mockup
- Include it as content in the application

The implementation will incorporate this image in the most appropriate way based on your request.

I'll ensure to create a proper component architecture with separate files for UI components, hooks, and utilities.

IMPORTANT: I will NOT create or reference local image assets.

I'll include ALL necessary imports in each file and make sure all dependencies are properly listed in package.json.
`;

/**
 * Prompt for Gemini when processing image data
 */
export const geminiImagePrompt = 
  "Please create a pixel-perfect implementation of the web design shown in the attached image. " +
  "Match the colors, typography, layout, spacing, and all visual elements exactly as shown. " +
  "Implement all UI components visible in the design. " +
  "IMPORTANT: Create multiple files with App.tsx as the main component and separate component files in a components directory. " +
  "DO NOT use local image files or assets. Instead, use these specific working Unsplash URLs: " +
  "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?auto=format&fit=crop&w=1600&q=80, " +
  "https://images.unsplash.com/photo-1707343848723-bd87dea7b118?auto=format&fit=crop&w=1600&q=80, " +
  "https://images.unsplash.com/photo-1707343846546-4c4d6e4e1f7a?auto=format&fit=crop&w=1600&q=80, " +
  "https://images.unsplash.com/photo-1707343848655-a196bfe88861?auto=format&fit=crop&w=1600&q=80, " +
  "https://images.unsplash.com/photo-1707343843445-5b0d0d080e8d?auto=format&fit=crop&w=1600&q=80, " +
  "https://images.unsplash.com/photo-1707343846292-5e1a00eaa7a2?auto=format&fit=crop&w=1600&q=80. " +
  "STRICT REQUIREMENT: Include ALL necessary imports in each file for every component, hook, or utility being used. " +
  "EVERY library used MUST be listed in package.json with correct versions. " +
  "You MUST format your response with proper code blocks that include filenames in this format:\n\n" +
  "filename: src/App.tsx\n```tsx\nimport React, { useState, useEffect } from 'react';\n// All necessary imports\n// code...\n```"; 