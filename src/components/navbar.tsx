import { ThemeToggle } from "./theme-toggle";

const NavBar = () => {
  return (
    <div className="container flex flex-row  items-center justify-between  py-2">
      <h2 className="sm:truncate-none flex flex-row space-x-4 truncate text-lg font-semibold">
        Ask Lucas
      </h2>
      <ThemeToggle />
    </div>
  );
};

export default NavBar;
