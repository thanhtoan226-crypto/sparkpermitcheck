const FIRST_NAMES = [
  "James", "Michael", "David", "Robert", "William",
  "Richard", "Thomas", "Mark", "Steven", "Andrew",
  "Daniel", "Matthew", "Christopher", "Anthony", "Brian",
  "Kevin", "Jason", "Timothy", "Ronald", "Gary",
  "Sarah", "Jessica", "Emily", "Amanda", "Melissa",
  "Stephanie", "Jennifer", "Rebecca", "Rachel", "Lauren",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones",
  "Miller", "Davis", "Garcia", "Rodriguez", "Wilson",
  "Martinez", "Anderson", "Taylor", "Thomas", "Moore",
  "Jackson", "Martin", "Lee", "Thompson", "White",
  "Harris", "Clark", "Lewis", "Robinson", "Walker",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateName(workerId: string): string {
  const num = parseInt(workerId, 10) || 1;
  const rand = seededRandom(num);
  const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
  return `${first} ${last}`;
}
