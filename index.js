// === Constants ===
const BASE = "https://fsa-crud-2aa9294fe819.herokuapp.com/api";
const COHORT = "2511-CPU-RM-WEB-PT"; // Make sure to change this!
const API = BASE + COHORT;

// === State ===
let parties = [];
let selectedParty;
let rsvps = [];
let guests = [];

/** Updates state with all parties from the API */
async function getParties() {
  try {
    const response = await fetch(API + "/events");
    const result = await response.json();
    parties = result.data;

    // keep selectedParty consistent if it still exists
    if (selectedParty) {
      const stillThere = parties.find((p) => p.id === selectedParty.id);
      if (!stillThere) selectedParty = undefined;
    }

    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with a single party from the API */
async function getParty(id) {
  try {
    const response = await fetch(API + "/events/" + id);
    const result = await response.json();
    selectedParty = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with all RSVPs from the API */
async function getRsvps() {
  try {
    const response = await fetch(API + "/rsvps");
    const result = await response.json();
    rsvps = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

/** Updates state with all guests from the API */
async function getGuests() {
  try {
    const response = await fetch(API + "/guests");
    const result = await response.json();
    guests = result.data;
    render();
  } catch (e) {
    console.error(e);
  }
}

// === NEW: API mutations ===

/** Creates a new party via POST, then refreshes parties */
async function createParty(party) {
  try {
    const response = await fetch(API + "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(party),
    });
    const result = await response.json();

    if (!response.ok) throw new Error(result?.error || "Failed to create party.");

    // Refresh parties list; optionally select the new party if API returns it
    await getParties();
    if (result?.data?.id) {
      await getParty(result.data.id);
    }
  } catch (e) {
    console.error(e);
  }
}

/** Deletes a party via DELETE, then refreshes parties */
async function deleteParty(id) {
  try {
    const response = await fetch(API + "/events/" + id, { method: "DELETE" });
    const result = await response.json();

    if (!response.ok) throw new Error(result?.error || "Failed to delete party.");

    // clear selection if we deleted the selected party
    if (selectedParty?.id === id) selectedParty = undefined;

    await getParties();
  } catch (e) {
    console.error(e);
  }
}

// === Components ===

/** Party name that shows more details about the party when clicked */
function PartyListItem(party) {
  const $li = document.createElement("li");

  if (party.id === selectedParty?.id) {
    $li.classList.add("selected");
  }

  $li.innerHTML = `
    <a href="#selected">${party.name}</a>
  `;
  $li.addEventListener("click", () => getParty(party.id));
  return $li;
}

/** A list of names of all parties */
function PartyList() {
  const $ul = document.createElement("ul");
  $ul.classList.add("parties");

  const $parties = parties.map(PartyListItem);
  $ul.replaceChildren(...$parties);

  return $ul;
}

/** NEW: Form to add a new party */
function PartyForm() {
  const $section = document.createElement("section");
  $section.innerHTML = `
    <h2>Add a new party</h2>
    <form id="new-party-form">
      <label>
        Name
        <input name="name" type="text" required />
      </label>

      <label>
        Description
        <input name="description" type="text" required />
      </label>

      <label>
        Date
        <input name="date" type="date" required />
      </label>

      <label>
        Location
        <input name="location" type="text" required />
      </label>

      <button type="submit">Add party</button>
    </form>
  `;

  const $form = $section.querySelector("#new-party-form");
  $form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData($form);
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const dateFromForm = String(formData.get("date") || ""); // "YYYY-MM-DD"
    const location = String(formData.get("location") || "").trim();

    // Convert to ISO string (API requires this)
    const isoDate = new Date(dateFromForm).toISOString();

    await createParty({ name, description, date: isoDate, location });
    $form.reset();
  });

  return $section;
}

/** Detailed information about the selected party */
function SelectedParty() {
  if (!selectedParty) {
    const $p = document.createElement("p");
    $p.textContent = "Please select a party to learn more.";
    return $p;
  }

  const $party = document.createElement("section");
  $party.innerHTML = `
    <h3>${selectedParty.name} #${selectedParty.id}</h3>
    <time datetime="${selectedParty.date}">
      ${selectedParty.date.slice(0, 10)}
    </time>
    <address>${selectedParty.location}</address>
    <p>${selectedParty.description}</p>

    <button id="delete-party">Delete party</button>

    <GuestList></GuestList>
  `;

  $party.querySelector("#delete-party").addEventListener("click", async () => {
    await deleteParty(selectedParty.id);
  });

  $party.querySelector("GuestList").replaceWith(GuestList());

  return $party;
}

/** List of guests attending the selected party */
function GuestList() {
  const $ul = document.createElement("ul");

  if (!selectedParty) return $ul;

  const guestsAtParty = guests.filter((guest) =>
    rsvps.find(
      (rsvp) => rsvp.guestId === guest.id && rsvp.eventId === selectedParty.id
    )
  );

  // Simple components can also be created anonymously:
  const $guests = guestsAtParty.map((guest) => {
    const $guest = document.createElement("li");
    $guest.textContent = guest.name;
    return $guest;
  });
  $ul.replaceChildren(...$guests);

  return $ul;
}

// === Render ===
function render() {
  const $app = document.querySelector("#app");
  $app.innerHTML = `
    <h1>Party Planner</h1>
    <main>
      <section>
        <h2>Upcoming Parties</h2>
        <PartyList></PartyList>
      </section>

      <section id="selected">
        <h2>Party Details</h2>
        <SelectedParty></SelectedParty>
      </section>
    </main>
  `;

  $app.querySelector("PartyList").replaceWith(PartyList());
  $app.querySelector("SelectedParty").replaceWith(SelectedParty());

  // NEW: add the form under the party list section
  const leftSection = $app.querySelector("main section");
  leftSection.appendChild(PartyForm());
}

async function init() {
  await getParties();
  await getRsvps();
  await getGuests();
  render();
}

init();
