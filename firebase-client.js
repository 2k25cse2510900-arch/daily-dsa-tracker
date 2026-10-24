const ready = (async () => {
  let stage = "firebase-config";
  try {
    const response = await fetch("/api/firebase-config", { credentials: "same-origin" });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Google sign-in is not configured.");
    const config = await response.json();
    stage = "firebase-sdk-load";
    const [{ getApps, initializeApp }, { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence, signInWithPopup, signOut }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js")
    ]);
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const auth = getAuth(app);
    stage = "firebase-auth-persistence";
    await setPersistence(auth, browserLocalPersistence);
    console.info("[member-auth]", { stage: "firebase-client-ready", outcome: "passed" });
    return { auth, GoogleAuthProvider, signInWithPopup, signOut };
  } catch (error) {
    console.warn("[member-auth]", { stage, outcome: "failed", code: error?.code || "initialization-error" });
    throw error;
  }
})();

window.memberFirebaseAuth = {
  ready,
  async signIn() {
    const { auth, GoogleAuthProvider, signInWithPopup } = await ready;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    let stage = "popup";
    try {
      console.info("[member-auth]", { stage, outcome: "started" });
      const result = await signInWithPopup(auth, provider);
      console.info("[member-auth]", { stage, outcome: "completed" });
      stage = "id-token-retrieval";
      const idToken = await result.user.getIdToken(true);
      console.info("[member-auth]", { stage, outcome: "completed" });
      return { idToken, uid: result.user.uid };
    } catch (error) {
      console.warn("[member-auth]", { stage, outcome: "failed", code: error?.code || "unknown" });
      throw error;
    }
  },
  async signOut() {
    const { auth, signOut } = await ready;
    await signOut(auth);
  }
};
