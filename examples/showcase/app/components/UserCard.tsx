"use client";

import React, { useState } from "react";
import { getRandomUser } from "../functions/user.ts";

interface UserData {
  name: string;
  email: string;
  role: string;
  avatar: string;
}

export function UserCard(): React.ReactElement {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    const result = await getRandomUser();
    setUser(result);
    setLoading(false);
  }

  return (
    <div className="demo-card">
      <div className="demo-card-header">
        <div className="demo-card-tag demo-card-tag--client">RPC Call</div>
        <div className="demo-card-title">Random User</div>
        <div className="demo-card-subtitle">
          Fetched from server via getRandomUser()
        </div>
      </div>
      <div className="demo-card-body">
        <button
          className="user-fetch-btn"
          onClick={handleFetch}
          disabled={loading}
        >
          {loading ? (
            <span>
              <span className="loading-spinner" />
              Fetching...
            </span>
          ) : (
            "Get Random User"
          )}
        </button>

        {user ? (
          <div className="user-profile">
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-meta">{user.email}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
        ) : (
          <div className="user-empty">
            Click the button to fetch a user from the server
          </div>
        )}
      </div>
    </div>
  );
}
