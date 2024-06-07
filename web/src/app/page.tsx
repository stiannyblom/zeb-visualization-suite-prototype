import { redirect } from 'next/navigation';

import { navConfig } from "@/config/nav"
import { createHrefWithSearchParams } from '@/utils/router';

export default async function Home(
  { searchParams }: { searchParams?: { year?: string, measuringPoint?: string, model?: string } }
) {

  const defaultPath = navConfig.defaultPath;

  if (searchParams === undefined) {
    redirect(defaultPath);
  } else {
    const newSearchParams = new URLSearchParams(searchParams);
    redirect(createHrefWithSearchParams({ targetPath: defaultPath, searchParams: newSearchParams }))
  }
}
