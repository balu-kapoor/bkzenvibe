/**
 * Utilities for the local preview functionality
 */

/**
 * Cleans component code for preview by:
 * 1. Removing TypeScript types
 * 2. Handling exports properly
 * 3. Fixing common React syntax issues
 */
export function cleanComponentCode(code: string): string {
  let cleanedCode = code;

  // First, strip TypeScript types
  cleanedCode = cleanedCode
    // Remove import type statements
    .replace(/import\s+type\s+.*?from\s+['"].*?['"]/g, '// types removed')
    .replace(/import\s+{\s*type\s+.*?}\s+from\s+['"].*?['"]/g, '// types removed')
    // Remove TypeScript interfaces and types
    .replace(/interface\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\}/g, '// interface removed')
    .replace(/type\s+[A-Za-z0-9_]+\s*=[\s\S]*?(?=[;\n]|$)/g, '// type removed')
    // Remove type annotations from variables, params and function returns
    .replace(/:\s*[A-Za-z0-9_<>[\]|&{},\s.()'"`?+*-]+(?=\s*[=,);]|$)/g, '')
    // Remove generic type parameters
    .replace(/<[A-Za-z0-9_<>[\]|&{},\s.()'"`?+*-]+>/g, '')
    // Remove type assertions
    .replace(/\s+as\s+[A-Za-z0-9_<>[\]|&{},\s.()'"`?+*-]+/g, '')
    // Remove non-null assertions (!)
    .replace(/!\s*(?=[,);]|$)/g, '')
    // Remove specific TypeScript-only constructs
    .replace(/readonly\s+/g, '')
    .replace(/declare\s+/g, '')
    .replace(/namespace\s+[A-Za-z0-9_]+\s*\{[\s\S]*?\}/g, '// namespace removed')
    // Handle more TypeScript syntax
    .replace(/\?\.\s*/g, '.') // Optional chaining
    .replace(/\s*\?:\s*/g, ':') // Optional property
    .replace(/\s*\?\s*(?=[,)]|$)/g, '') // Optional parameter
    .replace(/\s*!:\s*/g, ':') // Definite assignment assertion
    .replace(/\s*[|&]\s*undefined/g, '') // Remove union with undefined
    .replace(/\s*[|&]\s*null/g, ''); // Remove union with null

  // Handle React imports
  if (!cleanedCode.includes('import React')) {
    cleanedCode = 'import React from "react";\n' + cleanedCode;
  }

  // Handle exports
  if (cleanedCode.includes('export default')) {
    // Replace export default with MainComponent assignment
    cleanedCode = cleanedCode
      .replace(/export\s+default\s+function\s+(\w+)/, 'function $1')
      .replace(/export\s+default\s+class\s+(\w+)/, 'class $1')
      .replace(/export\s+default\s+(\w+)/, 'const MainComponent = $1')
      .replace(/export\s+default\s+/, 'const MainComponent = ');
  } else {
    // Try to identify a component to export as MainComponent
    const functionMatch = cleanedCode.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    const constComponentMatch = cleanedCode.match(/const\s+([A-Za-z0-9_]+)\s*=\s*(?:\(.*\)\s*=>|React\.memo|React\.forwardRef)/);
    const constJsxMatch = cleanedCode.match(/const\s+([A-Za-z0-9_]+)\s*=\s*<[^>]*>/);
    const classComponentMatch = cleanedCode.match(/class\s+([A-Za-z0-9_]+)\s+extends\s+React\.Component/);
    
    if (functionMatch || constComponentMatch || constJsxMatch || classComponentMatch) {
      const componentName = functionMatch?.[1] || constComponentMatch?.[1] || constJsxMatch?.[1] || classComponentMatch?.[1];
      if (componentName) {
        cleanedCode += `\n\nconst MainComponent = ${componentName};`;
      }
    } else {
      // Last resort: look for any export named function or const and use that
      const exportedFunctionMatch = cleanedCode.match(/export\s+function\s+([A-Za-z0-9_]+)\s*\(/);
      const exportedConstMatch = cleanedCode.match(/export\s+const\s+([A-Za-z0-9_]+)\s*=/);
      
      if (exportedFunctionMatch || exportedConstMatch) {
        const exportName = exportedFunctionMatch?.[1] || exportedConstMatch?.[1];
        if (exportName) {
          // Remove the export keyword
          cleanedCode = cleanedCode
            .replace(new RegExp(`export\\s+function\\s+${exportName}`), `function ${exportName}`)
            .replace(new RegExp(`export\\s+const\\s+${exportName}`), `const ${exportName}`);
          
          cleanedCode += `\n\nconst MainComponent = ${exportName};`;
        }
      }
    }
  }

  // Fix document.getElementById to avoid TypeScript non-null assertions
  cleanedCode = cleanedCode.replace(/getElementById\(['"]([^'"]+)['"]\)!/g, "getElementById('$1')");
  
  // Fix ReactDOM.createRoot syntax for browser compatibility
  cleanedCode = cleanedCode.replace(
    /ReactDOM\.createRoot\(([^)]+)\)\.render\(/g, 
    'ReactDOM.createRoot($1).render('
  );

  // Fix common JSX issues
  cleanedCode = cleanedCode
    // Fix adjacent JSX elements by wrapping in fragment
    .replace(
      /return\s*\(\s*([<][^>]*>[^<]*<\/[^>]*>)\s*([<][^>]*>[^<]*<\/[^>]*>)/g,
      'return (<React.Fragment>$1$2</React.Fragment>'
    )
    // Fix implicit returns in arrow functions with adjacent JSX
    .replace(
      /=>\s*([<][^>]*>[^<]*<\/[^>]*>)\s*([<][^>]*>[^<]*<\/[^>]*>)/g,
      '=> <React.Fragment>$1$2</React.Fragment>'
    );

  return cleanedCode;
}

/**
 * Handles basic sanitization of JSX code
 */
export function sanitizeJSX(code: string): string {
  // Fix malformed attributes (missing quotes, wrong equals, etc.)
  let fixed = code
    // Fix dark="text-2xl type patterns - convert incorrect attribute separations
    .replace(
      /(\s+)([a-zA-Z0-9_-]+)="([^"]*?)([a-zA-Z0-9_-]+)="([^"]*?)"/g,
      '$1$2="$3" $4="$5"'
    )
    // Fix missing quotes in JSX attributes
    .replace(/(\s+)([a-zA-Z0-9_-]+)=([a-zA-Z0-9_-]+)(\s+|>)/g, '$1$2="$3"$4')
    // Fix extra quotes and malformed attributes
    .replace(/=""/g, '=""')
    .replace(/="""/g, '=""');

  return fixed;
}

/**
 * Creates proper HTML with React and Babel configuration for preview
 */
export function createPreviewHtml(componentCode: string, cssCode: string = '', title: string = 'App Preview'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #root {
      height: 100vh;
      width: 100vw;
    }
    ${cssCode}
  </style>
  <!-- Error handling setup -->
  <script>
    window.addEventListener('error', function(e) {
      console.error('Runtime error:', e.message);
      document.getElementById('error-display').style.display = 'flex';
      document.getElementById('error-message').textContent = e.message;
      document.getElementById('error-stack').textContent = e.error ? e.error.stack : '';
    });
  </script>
</head>
<body>
  <div id="root"></div>
  <div id="error-display" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(255,255,255,0.95); flex-direction:column; align-items:center; justify-content:center; padding:20px; z-index:9999;">
    <div style="max-width:90%; width:600px; background:white; border:1px solid #f56565; border-radius:8px; overflow:hidden; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
      <div style="background:#f56565; color:white; padding:12px 16px; font-weight:bold; display:flex; justify-content:space-between; align-items:center;">
        <span>Preview Error</span>
        <button onclick="document.getElementById('error-display').style.display='none'" style="background:none; border:none; color:white; cursor:pointer; font-weight:bold;">×</button>
      </div>
      <div style="padding:16px; color:#2d3748;">
        <p id="error-message" style="margin:0 0 16px 0; font-family:monospace; white-space:pre-wrap; overflow-x:auto; font-weight:bold;"></p>
        <pre id="error-stack" style="margin:0 0 16px 0; font-size:12px; color:#4a5568; background:#f7fafc; padding:12px; border-radius:4px; overflow-x:auto; max-height:200px;"></pre>
        <div style="font-size:14px; color:#4a5568; margin-bottom:16px;">
          <strong>Common causes:</strong>
          <ul style="margin-top:8px; padding-left:20px;">
            <li>TypeScript syntax that wasn't properly converted</li>
            <li>Missing imports or dependencies</li>
            <li>Invalid JSX syntax or component structure</li>
            <li>React hooks not following the rules of hooks</li>
          </ul>
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button onclick="document.getElementById('error-display').style.display='none'" style="background:#e2e8f0; color:#4a5568; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:14px;">Close</button>
          <button onclick="location.reload()" style="background:#4299e1; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:14px;">Reload Preview</button>
        </div>
      </div>
    </div>
  </div>
  
  <script type="text/babel" data-type="module">
    try {
      ${componentCode}
      
      // Render the component
      const rootElement = document.getElementById('root');
      try {
        // Check if we have the MainComponent
        if (typeof MainComponent === 'undefined') {
          throw new Error("Could not find a component to render. Make sure your component is exported or properly defined.");
        }
        
        try {
          // Try using modern createRoot API
          const root = ReactDOM.createRoot(rootElement);
          root.render(
            <React.StrictMode>
              <MainComponent />
            </React.StrictMode>
          );
        } catch (e) {
          // Fall back to legacy render method if createRoot fails
          console.warn("Using legacy ReactDOM.render as fallback:", e);
          ReactDOM.render(
            <React.StrictMode>
              <MainComponent />
            </React.StrictMode>,
            rootElement
          );
        }
      } catch (e) {
        console.error('Error rendering component:', e);
        document.getElementById('error-display').style.display = 'flex';
        document.getElementById('error-message').textContent = e.message;
        document.getElementById('error-stack').textContent = e.stack;
      }
    } catch (e) {
      console.error('Error in component code:', e);
      document.getElementById('error-display').style.display = 'flex';
      document.getElementById('error-message').textContent = e.message;
      document.getElementById('error-stack').textContent = e.stack;
    }
  </script>
</body>
</html>
`
} 