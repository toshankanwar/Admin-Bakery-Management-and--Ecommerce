'use client'
import React, { useEffect, useState } from "react";
import axios from "axios";
import { db, collection, addDoc } from '@/firebase/firebase';

const PREDICTION_API_URL = "https://toshan-bakery-prediction-api.onrender.com/api/predictions";
const FIREBASE_COLLECTION = "stored_predictions";

export default function TomorrowPredictions() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tomorrow's date string in YYYY-MM-DD format (UTC-based)
  const tomorrowDateStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  useEffect(() => {
    async function fetchAndStore() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all predictions from API
        const response = await axios.get(PREDICTION_API_URL);
        const allPredictions = response.data;

        // Filter only predictions for tomorrow
        const tomorrowsPredictions = allPredictions.filter(
          (p) => p.date === tomorrowDateStr
        );

        setPredictions(tomorrowsPredictions);

        // Store predictions in Firestore collection
        for (const pred of tomorrowsPredictions) {
          await addDoc(collection(db, FIREBASE_COLLECTION), {
            ...pred,
            storedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Error fetching/storing predictions:", err);
        setError("Failed to load predictions.");
      } finally {
        setLoading(false);
      }
    }

    fetchAndStore();
  }, [tomorrowDateStr]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-indigo-100 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-8 sm:p-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-600">
          Tomorrow's Predictions
        </h1>
        <p className="text-center text-indigo-700 font-medium mb-8">
          Date: <span className="font-semibold">{tomorrowDateStr}</span>
        </p>

        {/* Note section */}
        <div className="mb-10 max-w-3xl mx-auto bg-indigo-100 border border-indigo-300 rounded-lg p-5 text-indigo-900 font-medium text-center italic shadow-sm">
          End-to-end prediction pipeline developed for early forecasting.
          <br />
          <a
            href={PREDICTION_API_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold hover:text-indigo-800"
            aria-label="Prediction API Endpoint"
          >
            View Prediction API Endpoint
          </a>
        </div>

        {loading && (
          <p className="text-center text-indigo-500 text-xl animate-pulse">Loading predictions...</p>
        )}

        {error && (
          <p className="text-center text-red-600 font-semibold text-lg mt-4">{error}</p>
        )}

        {!loading && !error && predictions.length === 0 && (
          <p className="text-center text-gray-500 text-lg italic">No predictions available for tomorrow.</p>
        )}

        {!loading && predictions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {predictions.map((pred, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-indigo-200 shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition duration-300 p-6 flex flex-col justify-between"
                role="region"
                aria-label={`Prediction for ${pred.item_name ? pred.item_name : pred.prediction_type}`}
              >
                <div>
                  <p className="text-indigo-600 uppercase tracking-widest font-semibold text-sm mb-2">
                    {pred.prediction_type.replace(/_/g, " ")}
                  </p>
                  {pred.item_name ? (
                    <p className="text-gray-900 font-semibold text-lg truncate" title={pred.item_name}>
                      {pred.item_name}
                    </p>
                  ) : (
                    <p className="text-gray-700 font-medium italic">Aggregate Prediction</p>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Date</span>
                  <span className="font-mono bg-indigo-100 text-indigo-700 rounded-lg py-1 px-3 text-lg font-semibold select-all">
                    {pred.date}
                  </span>
                </div>

                <div className="mt-4 text-right">
                  <p className="text-emerald-600 font-extrabold text-2xl">
                    {pred.predicted_value.toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Predicted Value</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
