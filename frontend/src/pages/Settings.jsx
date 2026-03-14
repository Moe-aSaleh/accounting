import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  fetchProtectedJson,
  postProtectedAction,
  postProtectedJson,
  putProtectedJson,
} from "../lib/api";

export default function Settings({
  onUnauthorized,
  onLogout,
  onSettingsSaved,
}) {
  const { currentUserRole = null } = useOutletContext();
  const [values, setValues] = useState({
    name: "",
    logo_url: "",
    contact_email: "",
    phone: "",
    address: "",
    currency: "AED",
  });
  const [currentUsername, setCurrentUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserValues, setNewUserValues] = useState({
    username: "",
    password: "",
    role: "staff",
  });
  const [pageError, setPageError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [userError, setUserError] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [isClearingMonth, setIsClearingMonth] = useState(false);
  const [isClearingYear, setIsClearingYear] = useState(false);
  const [maintenanceMonth, setMaintenanceMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [maintenanceYear, setMaintenanceYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [roleMessage, setRoleMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      try {
        const data = await fetchProtectedJson("/api/company-settings/", {
          onUnauthorized,
          fallbackMessage: "Failed to load company settings.",
        });

        if (!isActive || data === null) {
          return;
        }

        setCurrentUsername(data.current_username || "");
        setPageError("");
        setValues({
          name: data.name || "",
          logo_url: data.logo_url || "",
          contact_email: data.contact_email || "",
          phone: data.phone || "",
          address: data.address || "",
          currency: data.currency || "AED",
        });

        if (currentUserRole !== "owner") {
          return;
        }

        const userData = await fetchProtectedJson("/api/company-users/", {
          onUnauthorized,
          fallbackMessage: "Failed to load users.",
        });

        if (!isActive || userData === null) {
          return;
        }

        setUsers(userData);
        setRoleDrafts(
          userData.reduce((drafts, user) => {
            drafts[user.id] = user.role;
            return drafts;
          }, {}),
        );
      } catch (fetchError) {
        if (isActive) {
          setPageError(fetchError.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isActive = false;
    };
  }, [onUnauthorized, currentUserRole]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSettingsError("");
    setSuccessMessage("");

    try {
      const result = await putProtectedJson("/api/company-settings/", {
        onUnauthorized,
        fallbackMessage: "Failed to save company settings.",
        body: values,
      });

      if (!result) {
        return;
      }

      setValues({
        name: result.name || "",
        logo_url: result.logo_url || "",
        contact_email: result.contact_email || "",
        phone: result.phone || "",
        address: result.address || "",
        currency: result.currency || "AED",
      });
      setSuccessMessage("Company settings saved.");
      onSettingsSaved();
    } catch (saveError) {
      setSettingsError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = (profileId, nextRole) => {
    setRoleDrafts((currentDrafts) => ({
      ...currentDrafts,
      [profileId]: nextRole,
    }));
  };

  const handleSaveRole = async (profileId) => {
    setSavingRoleId(profileId);
    setUserError("");
    setRoleMessage("");

    try {
      const result = await putProtectedJson(`/api/company-users/${profileId}/role/`, {
        onUnauthorized,
        fallbackMessage: "Failed to update user role.",
        body: { role: roleDrafts[profileId] },
      });

      if (!result) {
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === profileId ? { ...user, role: result.role } : user,
        ),
      );
      setRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [profileId]: result.role,
      }));
      setRoleMessage(`Updated ${result.username} to ${result.role}.`);
    } catch (saveError) {
      setUserError(saveError.message);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleNewUserChange = (event) => {
    const { name, value } = event.target;
    setNewUserValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreatingUser(true);
    setUserError("");
    setSuccessMessage("");
    setRoleMessage("");

    try {
      const result = await postProtectedJson("/api/company-users/create/", {
        onUnauthorized,
        fallbackMessage: "Failed to create user.",
        body: newUserValues,
      });

      if (!result) {
        return;
      }

      setUsers((currentUsers) =>
        [...currentUsers, result].sort((left, right) => left.username.localeCompare(right.username)),
      );
      setRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.id]: result.role,
      }));
      setNewUserValues({
        username: "",
        password: "",
        role: "staff",
      });
      setSuccessMessage(`Created user ${result.username}.`);
    } catch (createError) {
      setUserError(createError.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleClearMonth = async () => {
    const warning = `This will permanently delete all income, expenses, and salaries for ${maintenanceMonth}. Continue?`;

    if (!window.confirm(warning)) {
      return;
    }

    setMaintenanceError("");
    setMaintenanceMessage("");
    setIsClearingMonth(true);

    try {
      const result = await postProtectedAction("/api/clear-month/", {
        onUnauthorized,
        fallbackMessage: "Failed to clear month records.",
        query: { month: maintenanceMonth },
      });

      if (!result) {
        return;
      }

      const deleted = result.deleted;
      setMaintenanceMessage(
        `Cleared ${result.month}: removed ${deleted.income} income, ${deleted.expense} expenses, and ${deleted.salary} salaries.`,
      );
    } catch (clearError) {
      setMaintenanceError(clearError.message);
    } finally {
      setIsClearingMonth(false);
    }
  };

  const handleClearYear = async () => {
    if (!/^\d{4}$/.test(maintenanceYear)) {
      setMaintenanceError("Enter a valid year in YYYY format.");
      setMaintenanceMessage("");
      return;
    }

    const warning = `This will permanently delete all income, expenses, salaries, and opening balances for year ${maintenanceYear}. Continue?`;

    if (!window.confirm(warning)) {
      return;
    }

    setMaintenanceError("");
    setMaintenanceMessage("");
    setIsClearingYear(true);

    try {
      const result = await postProtectedAction("/api/clear-year/", {
        onUnauthorized,
        fallbackMessage: "Failed to clear year records.",
        query: { year: maintenanceYear },
      });

      if (!result) {
        return;
      }

      const deleted = result.deleted;
      setMaintenanceMessage(
        `Cleared ${result.year}: removed ${deleted.income} income, ${deleted.expense} expenses, ${deleted.salary} salaries, and ${deleted.opening_balance} opening balances.`,
      );
    } catch (clearError) {
      setMaintenanceError(clearError.message);
    } finally {
      setIsClearingYear(false);
    }
  };

  return (
    <div className="ws-page">
      <div className="ws-page-head">
        <h2 className="ws-page-title">Settings</h2>
      </div>

      {currentUserRole === null || loading ? (
        <p className="ws-msg">Loading...</p>
      ) : currentUserRole !== "owner" ? (
        <p className="ws-msg error">Only the owner can access settings.</p>
      ) : (
        <div className="ws-settings-grid">
          {pageError && <p className="ws-msg error">{pageError}</p>}

          {/* Company Profile */}
          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Company Profile</h3>
            </div>

            <form className="ws-settings-form" onSubmit={handleSubmit}>
              <label className="ws-field">
                <span className="ws-label">Business Name</span>
                <input
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  placeholder="Your business name"
                  required
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Logo URL</span>
                <input
                  name="logo_url"
                  value={values.logo_url}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Contact Email</span>
                <input
                  name="contact_email"
                  type="email"
                  value={values.contact_email}
                  onChange={handleChange}
                  placeholder="office@example.com"
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Phone</span>
                <input
                  name="phone"
                  value={values.phone}
                  onChange={handleChange}
                  placeholder="+971 ..."
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Address</span>
                <input
                  name="address"
                  value={values.address}
                  onChange={handleChange}
                  placeholder="Workshop address"
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Currency</span>
                <select name="currency" value={values.currency} onChange={handleChange}>
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>

              <div className="ws-span-all ws-form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>

            {settingsError && <p className="ws-msg error">{settingsError}</p>}
            {successMessage && <p className="ws-msg success">{successMessage}</p>}
          </div>

          {/* Account */}
          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Account</h3>
            </div>
            <p className="ws-msg subtle" style={{ marginTop: 0, marginBottom: "14px" }}>
              Session actions and authentication controls.
            </p>
            <div className="ws-snapshot">
              <div className="ws-snapshot-row">
                <span>Session</span>
                <strong>Active</strong>
              </div>
              <div className="ws-snapshot-row">
                <span>Access</span>
                <strong>Authenticated</strong>
              </div>
            </div>
            <div className="ws-form-actions" style={{ marginTop: "16px" }}>
              <button type="button" className="ws-btn-danger" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>

          {/* Users & Permissions */}
          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Users &amp; Permissions</h3>
            </div>

            <form className="ws-user-form" onSubmit={handleCreateUser}>
              <label className="ws-field">
                <span className="ws-label">Username</span>
                <input
                  name="username"
                  value={newUserValues.username}
                  onChange={handleNewUserChange}
                  placeholder="new user"
                  required
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Password</span>
                <input
                  name="password"
                  type="password"
                  value={newUserValues.password}
                  onChange={handleNewUserChange}
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              <label className="ws-field">
                <span className="ws-label">Role</span>
                <select name="role" value={newUserValues.role} onChange={handleNewUserChange}>
                  <option value="owner">Owner</option>
                  <option value="accountant">Accountant</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>

              <div className="ws-user-submit">
                <button type="submit" disabled={creatingUser}>
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>

            <div className="ws-user-list">
              {users.map((user) => (
                <div key={user.id} className="ws-user-row">
                  <div className="ws-user-info">
                    <strong>{user.username}</strong>
                    <small>
                      Current role: {user.role}
                      {user.username === currentUsername ? " (you)" : ""}
                    </small>
                  </div>
                  <div className="ws-user-actions">
                    <select
                      value={roleDrafts[user.id] || user.role}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                    >
                      <option value="owner">Owner</option>
                      <option value="accountant">Accountant</option>
                      <option value="staff">Staff</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      className="ws-btn-ghost ws-btn-sm"
                      disabled={
                        savingRoleId === user.id ||
                        user.username === currentUsername ||
                        (roleDrafts[user.id] || user.role) === user.role
                      }
                      onClick={() => handleSaveRole(user.id)}
                    >
                      {savingRoleId === user.id ? "Saving..." : "Save Role"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {userError && <p className="ws-msg error">{userError}</p>}
            {roleMessage && <p className="ws-msg success">{roleMessage}</p>}
          </div>

          {/* Data Maintenance */}
          <div className="ws-card">
            <div className="ws-card-head">
              <h3 className="ws-card-title">Data Maintenance</h3>
            </div>
            <p className="ws-msg subtle" style={{ marginTop: 0, marginBottom: "16px" }}>
              Owner-only destructive actions. Please confirm carefully before deleting data.
            </p>

            <div className="ws-user-form">
              <label className="ws-field">
                <span className="ws-label">Month (YYYY-MM)</span>
                <input
                  type="month"
                  value={maintenanceMonth}
                  onChange={(event) => setMaintenanceMonth(event.target.value)}
                />
              </label>

              <div className="ws-user-submit">
                <button
                  type="button"
                  className="ws-btn-danger"
                  onClick={handleClearMonth}
                  disabled={isClearingMonth || isClearingYear}
                >
                  {isClearingMonth ? "Clearing..." : "Clear Month"}
                </button>
              </div>
            </div>

            <div className="ws-user-form" style={{ marginBottom: 0 }}>
              <label className="ws-field">
                <span className="ws-label">Year (YYYY)</span>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  step="1"
                  value={maintenanceYear}
                  onChange={(event) => setMaintenanceYear(event.target.value)}
                />
              </label>

              <div className="ws-user-submit">
                <button
                  type="button"
                  className="ws-btn-danger"
                  onClick={handleClearYear}
                  disabled={isClearingYear || isClearingMonth}
                >
                  {isClearingYear ? "Clearing..." : "Clear Year"}
                </button>
              </div>
            </div>

            {maintenanceError && <p className="ws-msg error">{maintenanceError}</p>}
            {maintenanceMessage && <p className="ws-msg success">{maintenanceMessage}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
