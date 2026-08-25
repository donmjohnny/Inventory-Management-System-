"""
clsResponse.py  -  the standard result envelope returned by every operation.

Every xxxOperation.py function returns this dict shape so the front end always
reads the same fields:

    {
        'blnSuccess': True / False,
        'strMessage': 'human readable summary',
        'dctData':    { ... payload ... },
        'dctError':   { 'IT001': ['Item code is required.'], ... },
    }

dctError is keyed by a module error code (two letters + three digits, e.g.
IT001) and each value is a LIST of messages for that code.
"""


def fnNewResult():
    """Return a fresh, successful-by-default envelope."""
    return {
        'blnSuccess': True,
        'strMessage': '',
        'dctData': {},
        'dctError': {},
    }


def fnAddError(dctResult, strCode, strMessage):
    """Append an error under strCode and flip the envelope to failure."""
    dctResult['blnSuccess'] = False
    dctResult['dctError'].setdefault(strCode, [])
    dctResult['dctError'][strCode].append(strMessage)
    return dctResult


def fnSuccess(dctResult, strMessage='', dctData=None):
    """Mark the envelope successful, attach a message and optional payload."""
    dctResult['blnSuccess'] = True
    dctResult['strMessage'] = strMessage
    if dctData is not None:
        dctResult['dctData'] = dctData
    return dctResult


def fnHasError(dctResult):
    """True when any error has been recorded."""
    return not dctResult['blnSuccess'] or bool(dctResult['dctError'])
