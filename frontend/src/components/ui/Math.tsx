interface MathProps {
  /** Raw MathML string */
  children: string;
  display?: boolean;
}

export function Math({ children, display = false }: MathProps) {
  return display ? (
    <div className="my-4 overflow-x-auto py-1 text-left text-base text-hydro-900">
      <math xmlns="http://www.w3.org/1998/Math/MathML" display="block"
        dangerouslySetInnerHTML={{ __html: children }} />
    </div>
  ) : (
    <math xmlns="http://www.w3.org/1998/Math/MathML"
      dangerouslySetInnerHTML={{ __html: children }} />
  );
}
