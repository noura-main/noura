"use client";

import { useState } from "react";
import Image from "next/image";
import { FoodCard } from "@/components/FoodCard";
import { HeroCard } from "@/components/HeroCard";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const meals = [
    {
      title: "Breakfast",
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Healthy breakfast bowl with vegetables and eggs",
      dishName: "Sunrise Power Bowl",
      description:
        "A bright, energizing bowl packed with protein, fiber, and fresh produce. It keeps you full through busy mornings while staying light.",
      ingredients: ["Eggs", "Avocado", "Cherry tomatoes", "Black beans"],
      calories: "410 kcal",
      tag: "High Protein",
    },
    {
      title: "Lunch",
      image:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Lunch plate with pasta and fresh greens",
      dishName: "Herb Garden Pasta",
      description:
        "A balanced midday meal with fresh herbs, veggies, and a satisfying grain base. Great for steady energy without the afternoon slump.",
      ingredients: ["Whole grain pasta", "Cucumber ribbons", "Spinach", "Lemon dressing"],
      calories: "520 kcal",
      tag: "Quick Meal",
    },
    {
      title: "Snacks",
      image:
        "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Colorful snack bowl with berries and fruit",
      dishName: "Berry Crunch Mix",
      description:
        "A sweet-and-refreshing snack blend that supports focus between meals. Naturally colorful, nutrient-dense, and easy to prep ahead.",
      ingredients: ["Blueberries", "Raspberries", "Greek yogurt", "Almonds"],
      calories: "280 kcal",
      tag: "No Refined Sugar",
    },
    {
      title: "Dinner",
      image:
        "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Dinner bowl with quinoa and roasted vegetables",
      dishName: "Roasted Veggie Quinoa",
      description:
        "A warm, comforting bowl with complete protein and roasted seasonal vegetables. Perfect for a wholesome dinner that still feels cozy.",
      ingredients: ["Quinoa", "Broccoli", "Carrots", "Olive oil"],
      calories: "470 kcal",
      tag: "Fiber Rich",
    },
  ];

  const founders = [
    {
      name: "Shreya Nambiar",
      role: "Product & Vision",
      contact: "shreya24nambiar@gmail.com",
      blurb:
        "Maya shapes the product direction and makes sure every feature keeps healthy cooking simple and realistic.",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Aadhira Vivekananad",
      role: "Culinary Systems",
      contact: "omar@noura.app",
      blurb:
        "Omar leads recipe intelligence and ingredient matching so users get quick meal ideas they can trust.",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Evelyn Qiao",
      role: "Community & Support",
      contact: "lina@noura.app",
      blurb:
        "Lina connects users with our team and ensures the Noura experience stays warm, inclusive, and helpful.",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const faqs = [
    {
      question: "What is Noura and how does it help me cook?",
      answer:
        "Noura helps you plan meals from ingredients you already have, with smart suggestions and nutrition context so healthy cooking feels simpler and less stressful.",
    },
    {
      question: "Is Noura free to use?",
      answer:
        "We offer a free tier with core features. Premium plans unlock deeper personalization, advanced meal planning, and priority support when you are ready.",
    },
    {
      question: "Can I use Noura on a tight grocery budget?",
      answer:
        "Yes. Noura is built to reduce waste and stretch your ingredients with budget-friendly ideas and flexible swaps that still taste great.",
    },
    {
      question: "How do I get help if something is not working?",
      answer:
        "Email outreach.noura@gmail.com or use the contact section above. Our team typically responds within one business day.",
    },
    {
      question: "Does Noura work for dietary preferences or allergies?",
      answer:
        "You can tailor suggestions around common preferences and restrictions. We are always improving how Noura adapts to your needs.",
    },
  ];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#063643] px-4 py-6 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-5">
        <Navbar />

        <main className="space-y-5">
          <section
            id="home"
            className="grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-5"
          >
            <HeroCard />

            <section className="grid gap-4 sm:grid-cols-2 lg:gap-5">
              {meals.map((meal) => (
                <FoodCard
                  key={meal.title}
                  title={meal.title}
                  image={meal.image}
                  imageAlt={meal.imageAlt}
                  dishName={meal.dishName}
                  description={meal.description}
                  ingredients={meal.ingredients}
                  calories={meal.calories}
                  tag={meal.tag}
                />
              ))}
            </section>
          </section>

          <section
            id="about"
            className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f2f1eb] to-[#dfe8de] p-6 md:p-10"
          >
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#4C8C28]/20 blur-2xl" />
            <div className="absolute -bottom-20 left-20 h-56 w-56 rounded-full bg-[#0b5f70]/20 blur-2xl" />

            <div className="relative grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <p className="inline-flex items-center rounded-full bg-[#0C5D6E]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0C5D6E]">
                  About Noura
                </p>
                <h2 className="max-w-xl text-4xl font-bold leading-[1.05] tracking-tight text-[#0C2F3D] md:text-6xl">
                  Cooking Support That Feels Human
                </h2>
                <p className="max-w-xl text-base leading-8 text-[#35515B] md:text-lg">
                  Noura helps you turn everyday ingredients into healthy meals,
                  snacks, and plans with less guesswork. We blend smart
                  recommendations with practical nutrition guidance so cooking
                  feels easier and more enjoyable every day.
                </p>
                <p className="max-w-xl text-base leading-8 text-[#35515B] md:text-lg">
                  From busy weekdays to budget-conscious grocery runs, Noura is
                  built to support real lifestyles. Our goal is simple: better
                  food choices, less waste, and more confidence in your kitchen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 overflow-hidden rounded-[2rem] shadow-lg">
                  <Image
                    src="https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1400&q=80"
                    alt="Healthy breakfast and fresh ingredients"
                    width={900}
                    height={520}
                    className="h-52 w-full object-cover md:h-60"
                  />
                </div>
                <div className="overflow-hidden rounded-[1.6rem] shadow-md">
                  <Image
                    src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80"
                    alt="Fresh produce and colorful vegetables"
                    width={400}
                    height={320}
                    className="h-40 w-full object-cover"
                  />
                </div>
                <div className="rounded-[1.6rem] bg-[#0C5D6E] p-4 text-white shadow-md">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 3v18" />
                      <path d="M3 12h18" />
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                  </div>
                  <p className="text-sm leading-6 text-white/90">
                    Built to simplify planning with smart, quick meal direction.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            id="contact"
            className="relative overflow-hidden rounded-[2.25rem] bg-[#0C3F4B] p-6 text-white md:p-10"
          >
            <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[#4C8C28]/25 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
              <p className="inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                Contact Us
              </p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
                Meet The Co-Founders
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/85 md:text-lg">
                Need help with meal planning, product support, or partnerships?
                Reach out to the team below and we will get back to you quickly.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {founders.map((founder) => (
                  <article
                    key={founder.name}
                    className="rounded-[2rem] border border-white/20 bg-white/10 p-5 text-center shadow-lg backdrop-blur-sm"
                  >
                    <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-[#93C66A]">
                      <Image
                        src={founder.image}
                        alt={founder.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{founder.name}</h3>
                    <p className="text-sm text-[#CFE8D0]">{founder.role}</p>
                    <a
                      href={`mailto:${founder.contact}`}
                      className="mt-2 block text-sm text-white/90 underline decoration-[#93C66A]"
                    >
                      {founder.contact}
                    </a>
                    <p className="mt-3 text-sm leading-6 text-white/85">
                      {founder.blurb}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-[2rem] bg-[#F2F1EB] p-5 text-[#0C2F3D] md:p-6">
                <h3 className="text-2xl font-bold tracking-tight">Contact Information</h3>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3 md:text-base">
                  <a
                    href="mailto:outreach.noura@gmail.com"
                    className="rounded-xl bg-white px-4 py-3 font-medium shadow-sm transition hover:bg-[#EAF3E3]"
                  >
                    General Help: outreach.noura@gmail.com
                  </a>
                  <a
                    className="rounded-xl bg-white px-4 py-3 font-medium shadow-sm transition hover:bg-[#EAF3E3]"
                  >
                    Customer Support: +1 (470) 844-2379
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section
            id="faq"
            className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f2f1eb] via-[#eef3ea] to-[#dfe8de] p-6 md:p-10"
          >
            <div className="absolute -right-10 top-1/3 h-40 w-40 rounded-full bg-[#4C8C28]/15 blur-2xl" />
            <div className="absolute bottom-8 left-8 h-32 w-32 rounded-full bg-[#0C5D6E]/10 blur-2xl" />

            <div className="relative">
              <p className="inline-flex items-center rounded-full bg-[#0C5D6E]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0C5D6E]">
                FAQ
              </p>
              <h2 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-[#0C2F3D] md:text-6xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#35515B] md:text-lg">
                Quick answers about Noura, healthy cooking, and how we can help
                you in the kitchen.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div
                      key={faq.question}
                      className="overflow-hidden rounded-[2rem] border border-[#0C2F3D]/10 bg-white/80 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqIndex((prev) =>
                            prev === index ? null : index
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6 md:py-5"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base font-semibold text-[#0C2F3D] md:text-lg">
                          {faq.question}
                        </span>
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#4C8C28]/40 bg-[#e8f5d8] text-xl font-bold leading-none text-[#3F7422] transition-transform duration-300 ${
                            isOpen ? "rotate-45" : ""
                          }`}
                          aria-hidden
                        >
                          +
                        </span>
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <p className="border-t border-[#0C2F3D]/10 px-5 pb-5 pt-4 text-sm leading-7 text-[#35515B] md:px-6 md:text-base md:leading-8">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
