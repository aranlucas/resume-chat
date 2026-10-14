import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { getProfile } from "@/lib/profile";

afterEach(() => vi.restoreAllMocks());

const resume = {
  basics: {
    name: "Lucas Arango",
    email: "private@example.com",
    location: { city: "Seattle" },
    profiles: [{ network: "GitHub", url: "https://github.com/aranlucas" }],
  },
  work: [
    { name: "DoorDash", position: "Senior Software Engineer", startDate: "2022-06" },
    {
      name: "Example Company",
      position: "Software Engineer",
      startDate: "2018-01",
      endDate: "2022-05",
    },
    {
      name: "Internship",
      position: "Software Engineer Intern",
      startDate: "2017-05",
      endDate: "2017-08",
    },
  ],
  education: [
    {
      institution: "University of Florida",
      studyType: "B.S.",
      area: "Computer Science",
      score: "3.9",
      endDate: "2018-05",
    },
  ],
};

test("getProfile returns public page data and a complete timeline without internships", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(resume));

  const profile = await getProfile();

  assert.equal(profile.name, "Lucas Arango");
  assert.equal(profile.location, "Seattle");
  assert.deepEqual(profile.links, [{ label: "GitHub", href: "https://github.com/aranlucas" }]);
  assert.equal("email" in profile, false);
  assert.deepEqual(
    profile.roles.map(({ company, years, role }) => ({ company, years, role })),
    [
      { company: "DoorDash", years: "2022–now", role: "Senior Software Engineer" },
      { company: "Example Company", years: "2018–2022", role: "Software Engineer" },
      { company: "University of Florida", years: "2018", role: "B.S. Computer Science, 3.9" },
    ],
  );
  assert.match(profile.roles[0].note, /grocery agent/);
  assert.equal(profile.roles[1].note, "");
  assert.equal(profile.roles[1].question, "What did Lucas do at Example Company?");
});

test("getProfile rejects invalid resume dates instead of rendering a broken timeline", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ ...resume, work: [{ ...resume.work[0], startDate: "2022-13" }] }),
  );

  await assert.rejects(getProfile(), /expected YYYY-MM/);
});

test("getProfile reports a failed resume request", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unavailable", { status: 503 }));

  await assert.rejects(getProfile(), /503/);
});
