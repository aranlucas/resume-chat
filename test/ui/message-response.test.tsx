import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MessageResponse } from "@/components/message-response";

test("response applies changed text direction when the answer text stays the same", () => {
  const { rerender } = render(<MessageResponse dir="ltr">Same answer</MessageResponse>);

  rerender(<MessageResponse dir="rtl">Same answer</MessageResponse>);

  expect(screen.getByText("Same answer").closest("[dir]")?.getAttribute("dir")).toBe("rtl");
  expect(screen.getByText("Same answer")).toBeDefined();
});
