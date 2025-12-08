import { FaChevronDown } from "react-icons/fa";

type FlowArrowProps = {
  active?: boolean;
};

export function FlowArrow({ active = false }: FlowArrowProps) {
  return (
    <div className="flex justify-center py-4">
      <div
        className={`flex flex-col items-center transition-all ${
          active ? "text-emerald-400 animate-bounce" : "text-slate-500"
        }`}
      >
        <FaChevronDown className="w-4 h-4" />
        <FaChevronDown
          className={`w-4 h-4 -mt-1 ${
            active ? "opacity-80" : "opacity-40"
          }`}
        />
      </div>
    </div>
  );
}
