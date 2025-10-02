// your async function
async function fetchMyProfileInfo() {
    try {
        const response = await fetch('/MyProfileInfo', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include' // send cookies if you're using cookie auth
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching profile info:', error);
        return null;
    }
}

async function getMyProfilePicUrl() {
  try {
    const res = await fetch("/MyProfilePic");

    if (!res.ok) {
      try {
        const err = await res.json();
        throw new Error(`Failed: ${res.status} - ${err.error || "Unknown error"}`);
      } catch {
        throw new Error(`Failed: ${res.status} - ${res.statusText}`);
      }
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob); // ✅ browser-safe URL
  } catch (err) {
    console.error("Error fetching profile picture:", err.message);
    return null;
  }
}

async function logout() {
  // 1. Confirm first
  const confirmDisconnect = confirm("Are you sure you want to logout?");
  if (!confirmDisconnect) return;

  try {
    const res = await fetch("/device/disconnect/me", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.error("❌ Disconnect failed:", data.error || res.statusText);
      alert(`Failed to logout: ${data.error || res.statusText}`);
      return;
    }

    console.log("✅ logout");

    // 2. Destroy body content
    document.body.innerHTML = "";

    // 3. Redirect
    window.location.href = "/";
  } catch (err) {
    console.error("❌ Error disconnecting:", err);
    alert("Unexpected error while logout");
  }
}
