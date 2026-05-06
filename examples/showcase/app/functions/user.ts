const users = [
  {
    id: "1",
    name: "Alice Chen",
    email: "alice@company.io",
    role: "Frontend Engineer",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@company.io",
    role: "Backend Developer",
  },
  {
    id: "3",
    name: "Carol Davis",
    email: "carol@company.io",
    role: "Full-Stack Developer",
  },
  {
    id: "4",
    name: "David Kim",
    email: "david@company.io",
    role: "DevOps Engineer",
  },
  {
    id: "5",
    name: "Eva Martinez",
    email: "eva@company.io",
    role: "UI Designer",
  },
  {
    id: "6",
    name: "Frank Wilson",
    email: "frank@company.io",
    role: "System Architect",
  },
  { id: "7", name: "Grace Lee", email: "grace@company.io", role: "Tech Lead" },
  {
    id: "8",
    name: "Henry Zhao",
    email: "henry@company.io",
    role: "Security Engineer",
  },
];

export async function getRandomUser() {
  // Simulate network latency
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 300)
  );

  const index = Math.floor(Math.random() * users.length);
  const user = users[index];

  return {
    ...user,
    avatar: user.name.split(" ").map((n) => n[0]).join(""),
    fetchedAt: new Date().toISOString(),
  };
}
