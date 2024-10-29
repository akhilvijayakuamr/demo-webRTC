from django.shortcuts import render

# Create your views here.


def chat(request):
    context = {}
    return render(request, 'chat/main.html', context)
