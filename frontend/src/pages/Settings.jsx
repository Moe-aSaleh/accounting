import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchProtectedJson, postProtectedJson, putProtectedJson } from "../lib/api";

export default function Settings({
  token,
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
  const [successMessage, setSuccessMessage] = useState("");
  const [roleMessage, setRoleMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadSettings = async () => {
      try {
        const data = await fetchProtectedJson("/api/company-settings/", {
          token,
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
          token,
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
  }, [token, onUnauthorized, currentUserRole]);

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
        token,
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
        token,
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
        token,
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
        </div>
      )}
    </section>
  );
}
