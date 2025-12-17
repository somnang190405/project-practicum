import React, { useState, useEffect } from "react";
import { getSalesReports } from "../services/firestoreService";
import './SalesReports.css';

const SalesReports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      const fetchedReports = await getSalesReports();
      setReports(fetchedReports);
    };
    fetchReports();
  }, []);

  return (
    <div className="sales-reports-container">
      <h2>Sales Reports</h2>
      <div className="sales-grid">
        {reports.map((report, idx) => (
          <div className="sales-card" key={idx}>
            <pre style={{ color: '#fff', background: 'none', margin: 0 }}>{JSON.stringify(report, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesReports;
