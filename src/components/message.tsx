import { cn } from "@/lib/utils";

interface MessageProps {
  message: string;
  role: "system" | "user" | "assistant" | string;
}

const Message = ({ message, role }: MessageProps) => {
  return (
    <div className={cn("flex items-end", { "justify-end": role === "user" })}>
      <div className="order-2 mx-2 flex max-w-xs flex-col items-start space-y-2 text-xs">
        <div>
          <span
            className={cn({
              "inline-block rounded-lg rounded-bl-none bg-gray-300 px-4 py-2 text-gray-600":
                role === "assistant",
              "inline-block rounded-lg rounded-br-none bg-blue-600 px-4 py-2 text-white":
                role === "user",
            })}
          >
            {message}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Message;
