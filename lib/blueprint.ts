// AUTO-GENERATED from docs/product/blueprint/blueprint.json (recovered original LifeGuide blueprint).
// The Core's fixed skeleton: 3 sections, 18 questions, each with a malleability level.
// Regenerate by re-running the generator if blueprint.json changes.

export type Malleability = "green" | "yellow" | "red";
export type BlueprintQuestion = { key: string; title: string; malleability: Malleability; description: string; example: string };
export type BlueprintSection = { title: string; description: string; questions: BlueprintQuestion[] };

export const BLUEPRINT: BlueprintSection[] = [
  {
    "title": "Crafting Your Persona",
    "description": "If you're here, it's because you have a vision for who you want to become and you want help getting there. So the first step is to write out that vision as clear as day. This section is about defining who you are, and who you want to become, in writing. Let’s get your thoughts out of your head, and shine a spotlight on them so you can **SEE** the ideal persona you’ve been thinking about for so long.",
    "questions": [
      {
        "key": "s1q0",
        "title": "Note to Self",
        "malleability": "green",
        "description": "You are here for a reason, why? What do you want to tell yourself? Who do you want to be? When you think of the brother, sister, mother, father, friend, co-worker, boss, *HUMAN* you want to be...... what does that person look like. Be specific, be open. This is the first thing you are seeing because this \"exercise\" opens up our minds to what's to follow - it's a method of looking inward.",
        "example": "eg. \"I want to be the person that everyone knows for doing ... I am humble but assertive...and I will...\""
      },
      {
        "key": "s1q1",
        "title": "Role to Embody",
        "malleability": "yellow",
        "description": "Give a persona definition to the person I described above. Get creative, as this persona is for me and only me.",
        "example": "ex. The Respected Military Commander: Someone who people trust to lead them in and out of war. Instills a sense of calmness in ALL of his people, and loves them all like his sons. Someone who thinks \"how yes\" instead of \"why not\" to do something."
      },
      {
        "key": "s1q2",
        "title": "Values to Live By",
        "malleability": "yellow",
        "description": "List of values that I want to embody - and why. Include both those I think I already attain, as well as those I want to acquire.",
        "example": "- Accountable (Responsible): Someone that people trust to get the job done\n- Disciplined: the superpower of doing what I want when I want to do it.\n- Kind: Make even my enemy into my friend.\n- Patient: Good things come to those who wait. And rushing never produced anything of value."
      },
      {
        "key": "s1q3",
        "title": "Role Models",
        "malleability": "green",
        "description": "Figures I look up to and why. Can be characters from shows, athlete, people from your life, ANYONE that you want to take something from.",
        "example": "- Richard Branson - Do the unthinkable, whilst attracting everyone to you.\n- Harvey Spector - Looks the part; doesn't bite his nails in a meeting, people take him seriously\n- Michael Jordan - Doesn't give excuses, but brings results. People trust him to get the job done when it matters\n- Friend 1 (professionalism and example)\n- Friend 2 (Composure and interpersonal skills)\n- Friend 3 - Started from nothing, I watched him. Showed the power of consistency and passion.\n- The future wife/husband - Someone worth improving for"
      },
      {
        "key": "s1q4",
        "title": "Weaknesses",
        "malleability": "green",
        "description": "The things that are most detrimental to your progress. Things that you have been battling for ages, and have tried time and time again to rid yourself of them. Weaknesses are distractions that directly influence your ability to achieve your goals: whether daily to-dos or year-long missions. Be brutal and honest with yourself here... this is for you.",
        "example": "- Sleeping in - I just always end my day thinking I could have done more, and there's so much I want to do that I could If I just wake up earlier.\n- Weed/beers (any vice really) -\n- ADHD (jump to the next thing) -"
      },
      {
        "key": "s1q5",
        "title": "My Mantra",
        "malleability": "red",
        "description": "Your personal mission statement to keep you focused.",
        "example": "eg. \"I will create something that people can't stop talking about, that even I won't believe I did.\""
      },
      {
        "key": "s1q6",
        "title": "Strengths",
        "malleability": "green",
        "description": "What are you good at? What do you feel confident doing? What do you *excel* at?\n\nLet yourself go wild here, don't hold back. Even if no one would agree with you, write it down. Maybe people dont see it because you aren't expressing it enough! *That's why you are here...*",
        "example": "- Working with people\n- leading teams\n- assertive when needed\n- very direct, does not hold back what needs to be said"
      }
    ]
  },
  {
    "title": "Setting Your Goals",
    "description": "After crafting our persona, in as much as we could get it in writing, let's turn up the heat and start defining goals. This is where most progression dies – *inability to define a concrete goals*. \n\nThe reason is that in an age when we can have anything and everything all at once, we find it difficult to settle on one thing to go after. The problem with that is we end up aimless wandering through life, wasting our precious time and resources getting nowhere, wondering why we aren’t living the life we want. Effectively, by not setting real goals you want to work towards in life, you are letting life decide for you. \n\nSo accept that if you want to successfully move forward, you must decide where you are going. You must set concrete goals. We will make this process as easy as can be. You wrote a note to yourself, you know what kind of person you want to become. Now lets leverage that and start from our high level goals (less concrete), and slowly work our way down to our daily (ultra concrete) goals.",
    "questions": [
      {
        "key": "s2q0",
        "title": "Life Goals",
        "malleability": "yellow",
        "description": "Write down at least 5 BIG life goals. Then challenge yourself to write down a reason for that goal (if it's just a dream goal without a reason, that's fine!). Go crazy, don't sell myself short. This is for my eyes only.\n\n * *No need for a finite time-horizon here - but advised!*",
        "example": "- *Climb Everest:* - childhood dream, and is the mental / physical challenge that will turn me into the person I aspire to become\n- *Start my dream [clothing] company:* I have all these designs and one of clothes that I made, that my friends love, and I aspire to work for myself so that I have the freedom to do as I choose and be independent… and work towards my goal as opposed to someone else. \n- *Backpack Across Asia:* I want to experience the freedom that comes with backpacking, and I feel like the only way to learn about the culture (and myself) is to do this thing. \n- *Own a house by age 30:* (in another county if you’re bold) -  I see it as a manifestation of stability and commitment*"
      },
      {
        "key": "s2q1",
        "title": "5 Year Goal",
        "malleability": "yellow",
        "description": "How do I want your life to look like in 5 Years? Get SPECIFIC, and don't be afraid. Considering where you are at now, and trusting that life works in your favor when you tell it where you want to go.",
        "example": "- I will be living in Israel and making money from the US\n- I will be self-employed, with the work revolving around bettering individuals...\n- I will be valued at 5 million+ USD\n - *I will consistently earn enough that I can support a wife and child, travel wherever whenever and however, able to buy the best if my heart desires.* \n- *I will be best friends with my sisters\n*- *I WILL have a safe house (land and a humble abode)* \n - *I will be leading a community*"
      },
      {
        "key": "s2q2",
        "title": "Yearly Goals",
        "malleability": "red",
        "description": "Build on your 5 year goal. Shouldn't be more than 3, preferably 2 or less. The less, the better as you will be putting 100% of your energy into getting it done. For every goal, describe a little about what you need to do to get there. Don't forget to set a finishing date!\n\n*If more than 1, write them down in order of priority.*",
        "example": "- Goal 1 - [DEADLINE]\n- how you plan to get it done?\n- Goal 2 - [DEADLINE]\n- how you plan to get it done?"
      },
      {
        "key": "s2q3",
        "title": "Monthly Goals",
        "malleability": "red",
        "description": "You can do a lot in a month. Decide on a habit you want to start, or break. Show yourself you are capable of achieving the goals you set in the short-term, and the long-term won't be so daunting.  Get good at hitting your monthly goals, and you’ll be on track to hitting your yearly goals.",
        "example": "- Keep up 5 am routine 1\n\n    - Get 8 hours of documented work a day (Using a tracker!!!!)\n\n    - Learn to work in shorter chunks (less than 2 hours)\n\n    -- Basically learn to get in the zone faster …\n\n    -- Practice this once a day. When I dont want to work, but I know I have no excuse not to…. JUSTst get on and try and get into the zone\n\n    - Practice Saying “Hello” to people 1st\n\n    - READ THIS LIST EVERY DAY FOR A MONTH"
      },
      {
        "key": "s2q4",
        "title": "Daily Goals",
        "malleability": "yellow",
        "description": "Things that can compound and have a profound impact on my life. Small things, that can easily compound. Get good at hitting your daily goals, and you'll be on track to hitting your yearly goals.",
        "example": "- EX. Learn Arabic 10 min a day: useful skill for the life I want to live\n- Read Something, anything, for 10 min a day: learn something new every day\n- Meditate 10 min a day: callous the mind to make everything else in my day-to-day easier."
      },
      {
        "key": "s2q5",
        "title": "Paint a North Star",
        "malleability": "red",
        "description": "After jotting down all the small details, now you are ready to paint a vivid image of your ultimate aspiration—the guiding beacon that directs all your smaller goals from daily tasks to long-term objectives...",
        "example": "eg. While Im still 26, nearing 27, 4 years, age 30, I will be self employed, have over a million to my name, and I will throw a celebratory birthday weekend with the people that are closest to me and helped me get there. I will fly mom and dad out to wherever is needed. On that day, they will both know that they dont need to worry anymore. Oh, and I will have a big piece of land, somewhere hard to get to, with a small plane that can take me anywhere and can house my family and their family. I will have a house [here] and [there], traveling with my family twice a year. I will have weekly hangouts with my friends, and monthly “im alive” parties… \n- eg. By the time I turn 30, I will have transitioned from law school to becoming an influential civil rights attorney. I will have established myself in a non-profit organization that focuses on fighting for equal rights and justice. By then I will have argued at least one case in front of a federal court, contributing to significant legal reforms. I envision using my legal skills to empower underrepresented communities, and to have published articles that educate the public on their rights and the importance of civic engagement. My ultimate aim is to be a voice for change, ensuring that justice is accessible for all\n- eg. In the next five years, I envision myself having successfully shifted from my current job in retail management to a fulfilling career in environmental science. This change will align with my passion for conservation and my commitment to making a positive impact on the planet. I plan to be involved in major environmental projects, possibly even leading initiatives that focus on sustainable practices within local communities. By the age of 35, I see myself as a key contributor to influential environmental policies, working closely with both governmental and non-governmental organizations. Alongside my career goals, I aim to balance my professional life with a nurturing family environment, supporting my spouse in their career aspirations and together, building a home that thrives on mutual respect, love, and shared values toward a greener world. Oh, and I will  have 2 children by then."
      }
    ]
  },
  {
    "title": "Forging Your Mindset",
    "description": "This section is about developing the mental resilience and positive mindset necessary to overcome challenges and stay committed to your goals. We will make it clear how your life is going to change, and implement proven methods to getting these things to stick.",
    "questions": [
      {
        "key": "s3q0",
        "title": "Expectations",
        "malleability": "yellow",
        "description": "You now know where you're going, and you know that the life you have painted for yourself is different than your current one. This means that change is inevitable, and that the things you were used to may need to be changed. So write down all the ways which you believe your new life will affect your old life. What tough situations do you expect to be in now that you are trying to incorporate new things into your life (while also removing old ones.",
        "example": "- *I’ll have to start waking up early - so I can start working on my side hustle BEFORE going to work*\n\n    - *I’ll need to distance myself from [X] as they [are a bad influence], holding me back, etc..*\n\n    - *Need to stop smoking - I want to run a marathon, and this isn’t good for training.*\n\n    - *I wont be able to eat the same food I’m used to [chips, candy, etc] because they will work against my weight goal*\n\n    - *No longer will I be able to hangout with the squad every night, ill have to start saying no - its leading me to sleep late and I’ll most likely smoke weed.*"
      },
      {
        "key": "s3q1",
        "title": "Some WHY's",
        "malleability": "green",
        "description": "Dynamic list of things I do in my life, and the inherent reason I am doing them. Make sure to include a short reason for doing this. If you know why, you will know how. *You can include things that are in your daily and monthly goals.",
        "example": "- Read Philosophy: to expand English abilities, expand my ability to think, Learn new ideas\n\n- Finishing my degree: to start what I finish, and to have a door-opening tool in the kit\n\n- Stop Smoking: it really is just a minor set back for the days to come. Lazier, hazier, less motivated… all for 3 hours of “fun”. **It takes the edge off, but I need the edge.**"
      },
      {
        "key": "s3q2",
        "title": "Time Tracking",
        "malleability": "green",
        "description": "How do you spend most of your time? Map your last week, your last day, the last few hours? What are you doing on the day to day, hour to hour? We want you to be aware\n\n- *If you know where you err, you will know how to correct.*",
        "example": "- over the last week I was building Lifeguide. I spend maybe 8 hours a day on it.\n\n- I also had long lunches/dinners (longer than I want but Ill work on it)\n\n- i had a coffe chat with a friend today that turned into a 3 hours social session. I didnt even think about it till I wrote it down here."
      },
      {
        "key": "s3q3",
        "title": "Flash Reminders",
        "malleability": "green",
        "description": "Just some quick things you want to remind yourself of every day. Can be as long as you want, just keep in mind, the longer it is, the more annoying it will be to read every day.",
        "example": "- Every decision can be the best decision, as long as it is looked at as such\n- Turn every situation into a positive one\n- When things truly take a turn for the worse, remember that all you can do is work to turn everything back to positive state.\n- As long as you're not dying, everything will be ok\n- Be the person the world will look up to (so everyone matters)"
      },
      {
        "key": "s3q4",
        "title": "A Quote",
        "malleability": "yellow",
        "description": "Put here ONE quote that you like and is fitting for the overall mindset you are going for. This can always change, but pick one.",
        "example": "Imagine you're talking to god about the person you want to become...\n- You say \"I want to be courageous.\"\n+ God replies \"Then I will give you monsters to terrify you. That way you can conquer them.\"\n- You say \"I want to be patient.\"\n+ God replies \"Then I will make you work harder and longer. That way you can learn to wait.\"\n- You say \"I want to be wise.\"\n+ God replies \"Then I will give you failures that will crush your spirit. That way you can learn the value of judgment.\"\n- You then say... \"That sounds like a hard life. Can you give me a good life?\"\n+ God replies \"Just like we measure the quality of a blacksmith by the strength of his steel, I measure you by what you are at the end, not the fire and the hammer it took to make you. A good life isn't an easy life. A good life makes you into a good person. And that, my child, is a hard life.\""
      }
    ]
  }
];
