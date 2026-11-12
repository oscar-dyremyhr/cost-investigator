import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
const heading=Bricolage_Grotesque({variable:"--font-bricolage",subsets:["latin"]});
const inter=Inter({variable:"--font-inter",subsets:["latin"]});
const mono=JetBrains_Mono({variable:"--font-jetbrains",subsets:["latin"]});
export const metadata:Metadata={title:"Cost Investigator · Databricks spend, explained",description:"Automated Databricks cost attribution and savings reports."};
const themeScript = `try { var theme = localStorage.getItem("cost-investigator-theme"); if (theme === "dark" || theme === "light") document.documentElement.setAttribute("data-theme", theme); } catch {}`;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning className={`${heading.variable} ${inter.variable} ${mono.variable}`}><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{children}</body></html>}
