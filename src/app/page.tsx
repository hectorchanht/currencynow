"use client";

import { pick } from 'lodash';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { CurrencyRate4All, CurrencyRate4BaseCur, fetcher, getCurrencyRateApiUrl } from './api';
import CountryImg from './components/CountryImg';
import CurrencyListModal from './components/CurrencyListModal';
import SearchBar from './components/SearchBar';
import { DefaultBaseCur, DefaultCurrency2Display, DefaultCurrencyValue } from './constants';
import { CrossSvg } from './svgs';

type CurrencyRates = {
  [key: string]: number;
};

const getDataFromLocalStorage = (name: string, defaultValue: any) => {
  if (typeof window === "undefined" || !window || !window.localStorage) return defaultValue
  const lsData = localStorage.getItem(name);
  if (lsData === null) return defaultValue;

  try {
    const lsDataParsed = JSON.parse(lsData);
    return lsDataParsed;
  } catch {
    return lsData
  }
};

export default function Home() {
  const currencyItemOnDrag = useRef<string>('');
  const [baseCur, setBaseCur] = useState<string>(getDataFromLocalStorage('baseCur', DefaultBaseCur));//getDataFromLocalStorage('baseCur', DefaultBaseCur));
  const [currency2Display, setCurrency2Display] = useState<string[]>(getDataFromLocalStorage('currency2Display', DefaultCurrency2Display));
  const [currencyValue, setCurrencyValue] = useState<number>(getDataFromLocalStorage('currencyValue', DefaultCurrencyValue));
  const [isEditing, setIsEditing] = useState(getDataFromLocalStorage('isEditing', false));
  const [isDefaultCurrencyValue, setIsDefaultCurrencyValue] = useState(getDataFromLocalStorage('isDefaultCurrencyValue', true));
  const [defaultCurrencyValue, setDefaultCurrencyValue] = useState(getDataFromLocalStorage('defaultCurrencyValue', DefaultCurrencyValue));

  const { data: data4BaseCur, error: err2 } = useSWR<CurrencyRate4BaseCur>(getCurrencyRateApiUrl({ baseCurrencyCode: baseCur }), fetcher, { keepPreviousData: true });
  const { data: data4All, error: err1, isLoading: isLoad1 } = useSWR<CurrencyRate4All>(getCurrencyRateApiUrl({}), fetcher, { keepPreviousData: true });

  const curObj: CurrencyRates = useMemo(() => {
    return pick(data4BaseCur?.[baseCur] as CurrencyRates, currency2Display);
  }, [data4BaseCur, baseCur, currency2Display]);

  const currencyRatesPairs2Display: [string, number][] = useMemo(() => {
    return Object.entries(curObj) || [];;
  }, [curObj]);

  useEffect(() => {
    localStorage.setItem("isDefaultCurrencyValue", (isDefaultCurrencyValue));
    localStorage.setItem("isEditing", (isEditing));
    localStorage.setItem("defaultCurrencyValue", (defaultCurrencyValue));
  }, [isEditing, isDefaultCurrencyValue, defaultCurrencyValue]);


  const addCurrency2Display = ({ name }: { name: string }) => {
    setCurrency2Display(cur => {
      const newCurrency2Display = [...cur, name];
      localStorage.setItem("currency2Display", JSON.stringify(newCurrency2Display));
      return newCurrency2Display;
    });
  }

  const removeCurrency2Display = ({ name }: { name: string }) => {
    setCurrency2Display(cur => {
      const newCurrency2Display = cur.filter(c => c !== name);
      localStorage.setItem("currency2Display", JSON.stringify(newCurrency2Display));
      return newCurrency2Display;
    });
  }

  const onBaseCurChange = (cur: string) => {
    if (isDefaultCurrencyValue) {
      setCurrencyValue(defaultCurrencyValue || 100);
    } else {
      const dataAfter = Object.entries(curObj).reduce<CurrencyRates>((acc, [code, val]) => {
        if (code === baseCur) {
          acc[code] = val;
        } else {
          acc[code] = val * currencyValue;
        }
        return acc;
      }, {});
      setCurrencyValue(dataAfter[cur] || 100);
    }
    setBaseCur(cur);
    localStorage.setItem("baseCur", (cur));
    localStorage.setItem("defaultCurrencyValue", (defaultCurrencyValue.toString()));
  }

  const handleCurrencyValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrencyValue(parseFloat(e.target.value));
    localStorage.setItem("currencyValue", (e.target.value));
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropZone = e.currentTarget; // The drop zone element
    const dropZoneRect = dropZone.getBoundingClientRect(); // Get the bounding rectangle of the drop zone

    // Get the mouse coordinates relative to the drop zone
    const dropY = e.clientY - dropZoneRect.top;

    // Calculate the index of the item where it was dropped
    const itemHeight = 72; // Assuming each currency item has a fixed height
    const itemIndex = Math.floor(dropY / itemHeight); // Calculate the index based on the Y coordinate

    // Now you can use itemIndex to determine where to place the dropped item
    // console.log(`Item dropped at index: ${itemIndex}`);

    const newCurrency2Display = [...currency2Display];
    const draggedIndex = newCurrency2Display.indexOf(currencyItemOnDrag.current);

    const [movedItem] = newCurrency2Display.splice(draggedIndex, 1);
    newCurrency2Display.splice(itemIndex, 0, movedItem);
    setCurrency2Display(newCurrency2Display);
    localStorage.setItem("currency2Display", JSON.stringify(newCurrency2Display));
  };

  if (err1 || err2) return <div className="text-center">Error fetching data. Please try again later.</div>;
  if (isLoad1) return <progress className="progress w-full mt-[2px]" />;

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">

        <div className='grid grid-cols-1 justify-between m-auto max-w-[800px] p-4'>
          <SearchBar data={data4All ?? {}} onSelect={addCurrency2Display} selected={currency2Display} />

          <br />

          <div className='' id='currencyList' onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
            {(currencyRatesPairs2Display).map(([cur, val], i) => {
              const val2Show = (val * currencyValue).toLocaleString(undefined, { minimumFractionDigits: ((val * currencyValue > 1) ? 3 : 10) }) ?? 0;

              return <div key={cur} id='currencyItem' draggable onDragStart={() => currencyItemOnDrag.current = cur}>
                <div className='flex gap-2 h-42 items-center'>
                  {cur === baseCur
                    ? null
                    : isEditing
                      ? <CrossSvg className={'cursor-pointer size-6'} onClick={() => removeCurrency2Display({ name: cur })} />
                      : null}

                  <div className='flex w-full justify-between items-center gap-4'>
                    <a href={cur === baseCur ? undefined : `/chart?q=${(cur + '-' + baseCur).toUpperCase()}`} className="text-start tooltip flex items-center gap-2" data-tip={data4All ? data4All[cur] : ''}>
                      <CountryImg code={cur} />
                      {cur.toUpperCase()}
                    </a>

                    {cur === baseCur
                      ? <input min={0} onChange={handleCurrencyValue} step=".01"
                        value={currencyValue} type="number" placeholder="🔍" className="bg-black h-[2em] max-w-[50vw] text-end" />
                      : <div onClick={() => onBaseCurChange(cur)} className=' text-end'>
                        {val2Show}
                      </div>}
                  </div>
                </div>
                {(i < currencyRatesPairs2Display.length - 1) ? <div className="divider my-2" /> : <br />}
              </div>
            })}
          </div>

        </div>
      </main>
      <CurrencyListModal data={data4All ?? {}} currency2Display={currency2Display} addCurrency2Display={addCurrency2Display} removeCurrency2Display={removeCurrency2Display}
        isDefaultCurrencyValue={isDefaultCurrencyValue} setIsDefaultCurrencyValue={setIsDefaultCurrencyValue}
        defaultCurrencyValue={defaultCurrencyValue} setDefaultCurrencyValue={setDefaultCurrencyValue}
        isEditing={isEditing} setIsEditing={setIsEditing}
      />
    </div>
  )
}
