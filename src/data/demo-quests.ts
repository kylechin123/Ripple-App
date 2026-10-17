import type { GeneratedSet } from "@/lib/ai/quests";
import type { Quiz } from "@/lib/ai/quiz";

/**
 * Pre-written quest sets used when DEMO_MODE=true or when the AI call fails,
 * so the demo never stalls on a slow or missing API.
 */
export const DEMO_QUESTS: Record<string, { set: GeneratedSet; quiz: Quiz }> = {
  "toogood-pond-litter": {
    set: {
      issue_slug: "toogood-pond-litter",
      match_reason: "You like being outdoors, and this one's a quick win you can actually see.",
      learn: {
        title: "Why litter at Toogood Pond matters",
        brief_md:
          "**Toogood Pond Park** in Unionville is one of Markham's busiest green spaces.\n\nAfter warm weekends, wrappers, cups and plastic pile up along the trail edges and near the water. Wind and rain then carry that litter **into the pond and the creek system that drains toward the Rouge River**.\n\nWhy it matters:\n- Plastic in water harms fish, turtles and birds.\n- Litter is **far easier to pick up on land** than to remove once it's in the water.\n- Park bins are emptied on a schedule, so overflowing bins are worth **reporting to the City of Markham**.\n\nA 20-minute cleanup with a friend makes a visible difference, and reporting full bins helps the city respond faster.",
        rubric: { time: 1, effort: 1, impact: 2 },
      },
      act: {
        title: "Do a 30-minute trail cleanup",
        task: "Bring gloves and a bag, pick up litter along the Toogood Pond trail with a friend, and take a photo of your filled bag at the park.",
        task_type: "cleanup",
        location_based: true,
        rubric: { time: 3, effort: 2, impact: 3 },
      },
      lead: {
        title: "Rally two friends for a pond sweep",
        task: "Invite at least 2 friends or squadmates to complete the trail cleanup quest this week.",
        rubric: { time: 4, effort: 3, impact: 4 },
      },
    },
    quiz: [
      { question: "Where does litter near Toogood Pond often end up?", options: ["In a landfill automatically", "In the pond and creeks draining toward the Rouge River", "It breaks down within a day", "In the city's recycling plant"], answer_idx: 1 },
      { question: "Why is it better to pick up litter on land?", options: ["It's far easier than removing it from water", "Land litter is more toxic", "The city fines people for water cleanups", "It isn't better"], answer_idx: 0 },
      { question: "What should you do about an overflowing park bin?", options: ["Ignore it", "Move it somewhere else", "Report it to the City of Markham", "Burn the trash"], answer_idx: 2 },
      { question: "Which animals does the brief say plastic in water can harm?", options: ["Only fish", "Cats and dogs", "None, plastic is harmless", "Fish, turtles and birds"], answer_idx: 3 },
    ],
  },
  "food-bank-volunteers": {
    set: {
      issue_slug: "food-bank-volunteers",
      match_reason: "Your design skills can turn a food drive into something people actually notice.",
      learn: {
        title: "How York Region food banks keep running",
        brief_md:
          "Food banks across **York Region** have seen **rising demand** as grocery and housing costs climb.\n\nMost run almost entirely on **volunteers** who sort donations, pack hampers and organise food drives. Shortages often hit **on weekdays and in summer**, when students are away.\n\nItems most often needed:\n- canned protein\n- rice\n- cooking oil\n- baby supplies\n\nYou can help by running a small food drive, signing up for a sorting shift, or making **clear, multilingual flyers** so more neighbours know what to give.",
        rubric: { time: 1, effort: 1, impact: 2 },
      },
      act: {
        title: "Design a 'most needed items' flyer",
        task: "Design a one-page flyer listing the most-needed food bank items (in at least two languages), print it or post it, and photograph it.",
        task_type: "design",
        location_based: false,
        rubric: { time: 3, effort: 3, impact: 2 },
      },
      lead: {
        title: "Run a mini food drive with your squad",
        task: "Get at least 2 friends or squadmates to make and post a flyer too, or to collect donations together.",
        rubric: { time: 4, effort: 4, impact: 4 },
      },
    },
    quiz: [
      { question: "Who do food banks mostly rely on to operate?", options: ["Paid staff only", "Volunteers", "Robots", "The federal government"], answer_idx: 1 },
      { question: "When do volunteer shortages often hit?", options: ["Weekdays and summer", "Only on holidays", "Weekend mornings", "Never"], answer_idx: 0 },
      { question: "Which of these is listed as a commonly needed item?", options: ["Fresh flowers", "Glass bottles", "Cooking oil", "Old clothing"], answer_idx: 2 },
      { question: "Why are multilingual flyers useful?", options: ["They're cheaper to print", "They're required by law", "They look nicer", "More neighbours can understand what to give"], answer_idx: 3 },
    ],
  },
  "newcomer-conversation-circles": {
    set: {
      issue_slug: "newcomer-conversation-circles",
      match_reason: "You enjoy meeting people, and an hour of your time goes a long way here.",
      learn: {
        title: "Why conversation circles matter in Markham",
        brief_md:
          "Markham is one of the **most diverse cities in Canada**, and many residents are newcomers building a life in a new language.\n\nLibraries and community centres run **English conversation circles**, relaxed groups where newcomers practise everyday conversation. They often **need more friendly volunteers**.\n\n**Loneliness and isolation** are common in a newcomer's first years. Small things help:\n- an hour of conversation\n- helping someone get a library card\n- walking through local services together",
        rubric: { time: 1, effort: 1, impact: 2 },
      },
      act: {
        title: "Volunteer at one conversation circle",
        task: "Attend one English conversation circle as a volunteer at a library or community centre and take a photo of the sign-in sheet, room or event poster (no faces needed).",
        task_type: "tutor",
        location_based: false,
        rubric: { time: 3, effort: 3, impact: 3 },
      },
      lead: {
        title: "Bring two friends to a circle",
        task: "Invite at least 2 friends or squadmates to volunteer at a conversation circle too.",
        rubric: { time: 4, effort: 3, impact: 4 },
      },
    },
    quiz: [
      { question: "What is a conversation circle?", options: ["A formal exam", "A relaxed group for practising everyday conversation", "A debate competition", "A book club for experts"], answer_idx: 1 },
      { question: "Where are conversation circles often run?", options: ["Libraries and community centres", "Shopping malls", "Hospitals", "Online only"], answer_idx: 0 },
      { question: "What challenge does the brief say is common for newcomers?", options: ["Too much free time", "Finding parking", "Loneliness and isolation", "Learning to drive"], answer_idx: 2 },
      { question: "Which is listed as a small way to help?", options: ["Lending money", "Writing their resume for them", "Translating legal documents", "Helping someone get a library card"], answer_idx: 3 },
    ],
  },
  "rouge-invasive-species": {
    set: {
      issue_slug: "rouge-invasive-species",
      match_reason: "You like nature and getting your hands dirty. The Rouge needs exactly that.",
      learn: {
        title: "The invasive plant problem in the Rouge",
        brief_md:
          "**Rouge National Urban Park** runs along Markham's eastern edge.\n\nInvasive plants like **dog-strangling vine** and **garlic mustard** spread fast, crowd out native wildflowers, and shrink habitat for pollinators such as **monarch butterflies**.\n\nHow people help:\n- joining **guided volunteer events** to pull invasives and plant natives\n- **staying on trails**\n- **cleaning seeds off boots and bikes**\n- learning to identify invasives and **reporting new patches**",
        rubric: { time: 1, effort: 2, impact: 2 },
      },
      act: {
        title: "Spot and report an invasive patch",
        task: "On a Rouge trail, find a patch of dog-strangling vine or garlic mustard, photograph it without leaving the trail, and note the location for park staff.",
        task_type: "report",
        location_based: true,
        rubric: { time: 2, effort: 2, impact: 3 },
      },
      lead: {
        title: "Join a guided pull with your squad",
        task: "Get at least 2 friends or squadmates to complete the invasive-patch quest or join a guided volunteer event with you.",
        rubric: { time: 5, effort: 4, impact: 4 },
      },
    },
    quiz: [
      { question: "Which pollinator does the brief mention?", options: ["Honeybees only", "Monarch butterflies", "Hummingbirds", "Bats"], answer_idx: 1 },
      { question: "Name an invasive plant mentioned in the brief.", options: ["Dog-strangling vine", "Maple", "Sunflower", "Milkweed"], answer_idx: 0 },
      { question: "What's one way visitors can stop invasive seeds spreading?", options: ["Picking wildflowers", "Feeding wildlife", "Cleaning seeds off boots and bikes", "Walking off-trail"], answer_idx: 2 },
      { question: "What do invasive plants do to native wildflowers?", options: ["Help them grow", "Nothing", "Pollinate them", "Crowd them out"], answer_idx: 3 },
    ],
  },
  "main-street-accessibility": {
    set: {
      issue_slug: "main-street-accessibility",
      match_reason: "You notice details, which makes you a great barrier-mapper.",
      learn: {
        title: "Accessibility on Main Street Markham",
        brief_md:
          "**Main Street Markham** is a historic district full of older storefronts.\n\nCommon barriers:\n- entrances with **steps and no ramp**\n- **uneven or narrow** sidewalk sections\n- crossings **without curb cuts**\n\nThese make visits harder for **wheelchair users, people with strollers, and seniors**. Ontario's accessibility law (**AODA**) sets standards for new and renovated spaces, but older buildings often lag behind.\n\nYou can help by **mapping barriers**, **reporting broken sidewalks** to the city, and encouraging businesses to add **portable ramps**.",
        rubric: { time: 1, effort: 1, impact: 2 },
      },
      act: {
        title: "Map and report one barrier",
        task: "Find one accessibility barrier on Main Street Markham (a step-only entrance, a broken sidewalk or a missing curb cut), photograph it, and report it to the city.",
        task_type: "report",
        location_based: true,
        rubric: { time: 2, effort: 2, impact: 3 },
      },
      lead: {
        title: "Barrier-mapping walk with your squad",
        task: "Get at least 2 friends or squadmates to map and report a barrier too.",
        rubric: { time: 4, effort: 3, impact: 4 },
      },
    },
    quiz: [
      { question: "What does AODA set standards for?", options: ["Parking fees", "Accessibility in new and renovated spaces", "Store hours", "Food safety"], answer_idx: 1 },
      { question: "Which is listed as a common barrier?", options: ["Entrances with steps and no ramp", "Too many benches", "Bright lights", "Wide sidewalks"], answer_idx: 0 },
      { question: "Who does the brief say these barriers affect?", options: ["Only cyclists", "Nobody", "Wheelchair users, people with strollers, and seniors", "Only delivery drivers"], answer_idx: 2 },
      { question: "What can businesses add to help?", options: ["More steps", "Taller doors", "Louder music", "Portable ramps"], answer_idx: 3 },
    ],
  },
};
