"use client"

import { Dispatch, SetStateAction, createContext, useContext, useState } from "react";


const NavbarContext = createContext({
  isOpen: false,
  setIsOpen: (() => { }) as Dispatch<SetStateAction<boolean>>
});

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (!context) throw new Error('useNavbar must be used within an NavbarProvider');
  return context;
};

export const NavbarProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <NavbarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </NavbarContext.Provider>
  );
};
