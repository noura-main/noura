"use client";

import { useState } from "react";

type FoodCardProps = {
  title: string;
  image: string;
  dishName: string;
  description: string;
  ingredients: string[];
  imageAlt?: string;
  calories?: string;
  tag?: string;
};

export function FoodCard({
  title,
  image,
  dishName,
  description,
  ingredients,
  imageAlt,
  calories,
  tag,
}: FoodCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <article
      className="relative min-h-[230px] [perspective:1200px] md:min-h-[260px]"
      onMouseLeave={() => setIsFlipped(false)}
    >
      <div
        className={`relative h-full w-full rounded-[2rem] shadow-md transition-transform duration-700 [transform-style:preserve-3d] ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        } ${!isFlipped ? "hover:scale-[1.02] hover:shadow-xl" : ""}`}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[2rem] bg-cover bg-center [backface-visibility:hidden] cursor-pointer"          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={imageAlt ?? `${title} food image`}
          onClick={() => setIsFlipped(true)}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F5D8]/95 text-4xl leading-none text-[#4C8C28] shadow-sm transition-transform duration-300 hover:scale-105"
            aria-label={`Show ${title} details`}
            onClick={(e) => e.stopPropagation()}
          >
            +
          </button>

          <p className="absolute bottom-5 left-5 z-10 text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
            {title}
          </p>
        </div>

        <button
          type="button"
          className="absolute inset-0 h-full w-full rounded-[2rem] bg-[#F1EFE9] p-5 text-left text-[#0C2F3D] [backface-visibility:hidden] [transform:rotateY(180deg)] md:p-6"
          onClick={() => setIsFlipped(false)}
          aria-label={`Close ${title} details`}
        >
          <div className="h-full overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">            <h3 className="text-2xl font-bold leading-tight md:text-3xl">
              {dishName}
            </h3>

            {calories && (
              <p className="mt-1 text-sm font-semibold text-[#35515B]">
                {calories}
              </p>
            )}

            <p className="mt-3 text-sm leading-6 text-[#35515B] md:text-[0.95rem]">
              {description}
            </p>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#27424C]">
              {ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>

            {tag && (
              <span className="mt-3 inline-flex rounded-full bg-[#D5EADB] px-3 py-1 text-xs font-semibold text-[#1E5B46]">
                {tag}
              </span>
            )}
          </div>
        </button>
      </div>
    </article>
  );
}
