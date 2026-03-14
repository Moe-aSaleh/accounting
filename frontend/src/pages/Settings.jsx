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

        if (
          !isActive ||
          userData === null
        ) {
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
    <section className="panel data-panel">
      <h2 className="section-title">Settings</h2>

      {currentUserRole === null || loading ? (
        <p className="status-message">Loading...</p>
      ) : currentUserRole !== "owner" ? (
        <p className="status-message error">Only the owner can access settings.</p>
      ) : (
        <div className="settings-grid">
          {pageError && <p className="status-message error">{pageError}</p>}
          <section className="sub-panel">
            <h3 className="sub-panel-title">Company Profile</h3>

            <form className="settings-form" onSubmit={handleSubmit}>
              <label className="field-group">
                <span>Business Name</span>
                <input
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  placeholder="Your business name"
                  required
                />
              </label>

              <label className="field-group">
                <span>Logo URL</span>
                <input
                  name="logo_url"
                  value={values.logo_url}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
              </label>

              <label className="field-group">
                <span>Contact Email</span>
                <input
                  name="contact_email"
                  type="email"
                  value={values.contact_email}
                  onChange={handleChange}
                  placeholder="office@example.com"
                />
              </label>

              <label className="field-group">
                <span>Phone</span>
                <input
                  name="phone"
                  value={values.phone}
                  onChange={handleChange}
                  placeholder="+971 ..."
                />
              </label>

              <label className="field-group">
                <span>Address</span>
                <input
                  name="address"
                  value={values.address}
                  onChange={handleChange}
                  placeholder="Workshop address"
                />
              </label>

              <label className="field-group">
                <span>Currency</span>
                <select
                  name="currency"
                  value={values.currency}
                  onChange={handleChange}
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>

              <div className="record-form-actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>

            {settingsError && <p className="status-message error">{settingsError}</p>}
            {successMessage && <p className="status-message success">{successMessage}</p>}
          </section>

          <section className="sub-panel">
            <h3 className="sub-panel-title">Account</h3>
            <p className="status-message subtle settings-copy">
              Use this area for session actions. User roles and permissions can be added next.
            </p>
            <div className="snapshot-list">
              <div className="snapshot-row">
                <span>Session</span>
                <strong>Active</strong>
              </div>
              <div className="snapshot-row">
                <span>Access</span>
                <strong>Authenticated</strong>
              </div>
            </div>
            <div className="section-actions compact-actions top-gap">
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </div>
          </section>

          <section className="sub-panel">
            <h3 className="sub-panel-title">Users & Permissions</h3>
            <form className="settings-user-form" onSubmit={handleCreateUser}>
              <label className="field-group">
                <span>Username</span>
                <input
                  name="username"
                  value={newUserValues.username}
                  onChange={handleNewUserChange}
                  placeholder="new user"
                  required
                />
              </label>

              <label className="field-group">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={newUserValues.password}
                  onChange={handleNewUserChange}
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              <label className="field-group">
                <span>Role</span>
                <select
                  name="role"
                  value={newUserValues.role}
                  onChange={handleNewUserChange}
                >
                  <option value="owner">Owner</option>
                  <option value="accountant">Accountant</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>

              <div className="settings-user-submit">
                <button type="submit" disabled={creatingUser}>
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>

            <div className="user-role-list">
              {users.map((user) => (
                <div key={user.id} className="user-role-row">
                  <div className="user-role-main">
                    <strong>{user.username}</strong>
                    <small>
                      Current role: {user.role}
                      {user.username === currentUsername ? " (you)" : ""}
                    </small>
                  </div>
                  <div className="user-role-actions">
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
                      className="secondary-button"
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
            {userError && <p className="status-message error">{userError}</p>}
            {roleMessage && <p className="status-message success">{roleMessage}</p>}
          </section>

          <section className="sub-panel">
            <h3 className="sub-panel-title">Data Maintenance</h3>
            <p className="status-message subtle settings-copy">
              Owner-only destructive actions. Please confirm carefully before deleting data.
            </p>

            <div className="settings-user-form">
              <label className="field-group">
                <span>Month (YYYY-MM)</span>
                <input
                  type="month"
                  value={maintenanceMonth}
                  onChange={(event) => setMaintenanceMonth(event.target.value)}
                />
              </label>

              <div className="settings-user-submit">
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleClearMonth}
                  disabled={isClearingMonth || isClearingYear}
                >
                  {isClearingMonth ? "Clearing..." : "Clear Month"}
                </button>
              </div>
            </div>

            <div className="settings-user-form">
              <label className="field-group">
                <span>Year (YYYY)</span>
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  step="1"
                  value={maintenanceYear}
                  onChange={(event) => setMaintenanceYear(event.target.value)}
                />
              </label>

              <div className="settings-user-submit">
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleClearYear}
                  disabled={isClearingYear || isClearingMonth}
                >
                  {isClearingYear ? "Clearing..." : "Clear Year"}
                </button>
              </div>
            </div>

            {maintenanceError && <p className="status-message error">{maintenanceError}</p>}
            {maintenanceMessage && <p className="status-message success">{maintenanceMessage}</p>}
          </section>
        </div>
      )}
    </section>
  );
}
