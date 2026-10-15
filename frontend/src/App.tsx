import { BrowserRouter, Route, Routes } from 'react-router';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <main>
              <h1>Home Furniture App</h1>
              <p>The application is ready for catalogue development.</p>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
