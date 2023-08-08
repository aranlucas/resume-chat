import Link from "next/link";
import Icon from "./icons";
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "./ui/separator";

const NavBar = () => {
  return (
    <>
      <div className="container flex flex-row  items-center justify-between  py-2">
        <h2 className="flex flex-row space-x-4 truncate text-lg font-semibold">
          Ask Lucas
        </h2>
        <div className="flex items-center justify-end space-x-2">
          <Link href="https://github.com/aranlucas/resume-chat">
            <Icon name="github" className="ml-2 h-6 w-6" />
          </Link>

          <ThemeToggle />
        </div>
      </div>
      <Separator />
    </>
  );
};

export default NavBar;
